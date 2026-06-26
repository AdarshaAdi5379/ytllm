import httpx
import re
from loguru import logger
from youtube_transcript_api import YouTubeTranscriptApi

from app.config import config
from app.utils.chunk_segments import TranscriptSegment
from app.services.whisper_service import download_and_transcribe


class VideoMetadata:
    def __init__(
        self, title: str, channel_name: str, duration: str, thumbnail_url: str
    ):
        self.title = title
        self.channel_name = channel_name
        self.duration = duration
        self.thumbnail_url = thumbnail_url


class TranscriptResult:
    def __init__(
        self,
        text: str,
        language: str,
        is_auto_generated: bool,
        segments: list[TranscriptSegment],
    ):
        self.text = text
        self.language = language
        self.is_auto_generated = is_auto_generated
        self.segments = segments


async def fetch_video_metadata(video_id: str) -> VideoMetadata:
    """Fetches video metadata by scraping YouTube watch page."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.youtube.com/watch?v={video_id}",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            )
            html = response.text

            title_match = re.search(r"<title>(.*?)</title>", html)
            title = (
                title_match.group(1).replace(" - YouTube", "")
                if title_match
                else "Unknown Video"
            )

            channel_match = re.search(r'"ownerChannelName":"([^"]+)"', html)
            channel_name = (
                channel_match.group(1) if channel_match else "Unknown Channel"
            )

            length_match = re.search(r'"lengthSeconds":"(\d+)"', html)
            duration = "0:00"
            if length_match:
                seconds = int(length_match.group(1))
                h = seconds // 3600
                m = (seconds % 3600) // 60
                s = seconds % 60
                duration = f"{h}:{m:02d}:{s:02d}" if h > 0 else f"{m}:{s:02d}"

            return VideoMetadata(
                title=title,
                channel_name=channel_name,
                duration=duration,
                thumbnail_url=f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            )
    except Exception as e:
        logger.warning("Metadata fetch failed for {}: {}", video_id, e)
        return VideoMetadata(
            title="Unknown Video",
            channel_name="Unknown Channel",
            duration="0:00",
            thumbnail_url=f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        )


async def fetch_transcript_via_timedtext(video_id: str) -> TranscriptResult | None:
    """Fallback: fetches transcript via timedtext endpoint."""
    base_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "*/*",
    }

    # Try to get available languages
    available_langs = []
    try:
        async with httpx.AsyncClient() as client:
            list_url = f"https://www.youtube.com/api/timedtext?v={video_id}&type=list"
            list_resp = await client.get(list_url, headers=base_headers, timeout=10.0)
            if list_resp.text:
                lang_matches = re.findall(r'lang_code="([^"]+)"', list_resp.text)
                available_langs = lang_matches
                logger.debug("Available caption languages for {}: {}", video_id, available_langs)
    except Exception as e:
        logger.warning("Failed to list captions for {}: {}", video_id, e)

    # Try common languages first
    lang_candidates = ["en", "en-US", "en-GB"]

    async with httpx.AsyncClient() as client:
        for lang in lang_candidates:
            urls = [
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang={lang}&fmt=vtt",
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang={lang}&asr=1&fmt=vtt",
            ]

            for url in urls:
                try:
                    response = await client.get(url, headers=base_headers, timeout=10.0)
                    if response.text and len(response.text) > 50:
                        segments = _parse_vtt_to_segments(response.text)
                        text = _segments_to_text(segments)
                        if len(text.split()) >= config["transcript_min_words"]:
                            logger.info("Found captions via timedtext ({}) for {}", lang, video_id)
                            return TranscriptResult(
                                text=text,
                                language=lang,
                                is_auto_generated="asr=1" in url,
                                segments=segments,
                            )
                except Exception:
                    continue

        # Try available languages
        for lang in available_langs:
            try:
                url = f"https://www.youtube.com/api/timedtext?v={video_id}&lang={lang}&fmt=vtt"
                response = await client.get(url, headers=base_headers, timeout=10.0)
                if response.text and len(response.text) > 50:
                    segments = _parse_vtt_to_segments(response.text)
                    text = _segments_to_text(segments)
                    if len(text.split()) >= config["transcript_min_words"]:
                        logger.info("Found captions via timedtext ({}) for {}", lang, video_id)
                        return TranscriptResult(
                            text=text,
                            language=lang,
                            is_auto_generated=True,
                            segments=segments,
                        )
            except Exception:
                continue

    return None


def _parse_vtt_to_segments(vtt_content: str) -> list[TranscriptSegment]:
    """Parses a VTT caption file into time-stamped segments."""
    lines = vtt_content.splitlines()
    segments: list[TranscriptSegment] = []

    i = 0
    last_text = ""
    while i < len(lines):
        line = lines[i].strip()

        # Skip headers and comments
        if not line or line == "WEBVTT" or line.startswith("NOTE") or line.startswith("STYLE"):
            i += 1
            continue

        # Skip pure numeric cue IDs
        if re.match(r"^\d+$", line):
            i += 1
            continue

        # Cue timing line
        if "-->" in line:
            parts = [p.strip() for p in line.split("-->", 1)]
            start_raw = parts[0]
            end_raw = parts[1].split()[0] if len(parts) > 1 else ""

            try:
                start_s = _parse_vtt_timestamp_to_seconds(start_raw)
                end_s = _parse_vtt_timestamp_to_seconds(end_raw)
            except Exception:
                i += 1
                continue

            i += 1
            cue_text_lines: list[str] = []
            while i < len(lines) and lines[i].strip():
                cue_line = lines[i].strip()
                cue_line = re.sub(r"<[^>]+>", "", cue_line).strip()
                if cue_line:
                    cue_text_lines.append(cue_line)
                i += 1

            cue_text = " ".join(cue_text_lines).strip()
            cue_text = _clean_transcript_text(cue_text)
            if cue_text and cue_text != last_text:
                segments.append(
                    TranscriptSegment(text=cue_text, start_s=float(start_s), end_s=float(end_s))
                )
                last_text = cue_text
            i += 1
            continue

        i += 1

    # Ensure monotonic time ranges
    normalized: list[TranscriptSegment] = []
    prev_end = 0.0
    for seg in segments:
        start_s = max(float(seg.start_s), prev_end)
        end_s = max(float(seg.end_s), start_s)
        normalized.append(TranscriptSegment(text=seg.text, start_s=start_s, end_s=end_s))
        prev_end = end_s
    return normalized


def _parse_vtt_timestamp_to_seconds(ts: str) -> float:
    """
    Parses VTT timestamps like:
    - HH:MM:SS.mmm
    - MM:SS.mmm
    - HH:MM:SS,mmm
    - MM:SS,mmm
    """
    raw = (ts or "").strip()
    if not raw:
        raise ValueError("empty timestamp")

    raw = raw.replace(",", ".")
    parts = raw.split(":")
    if len(parts) == 3:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
    elif len(parts) == 2:
        hours = 0
        minutes = int(parts[0])
        seconds = float(parts[1])
    else:
        raise ValueError(f"invalid timestamp: {ts}")

    return float(hours * 3600 + minutes * 60 + seconds)


def _segments_to_text(segments: list[TranscriptSegment]) -> str:
    return _clean_transcript_text(" ".join(seg.text for seg in segments if seg.text))


def _clean_transcript_text(text: str) -> str:
    """Cleans and normalizes transcript text."""
    cleaned = re.sub(r"\[([^\]]+)\]", "", text)  # Remove speaker labels
    cleaned = (
        cleaned.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


async def fetch_transcript(video_id: str) -> TranscriptResult:
    """Main transcript fetch function."""
    logger.info("Fetching transcript for video: {}", video_id)

    # Try youtube-transcript library
    try:
        api = YouTubeTranscriptApi()
        # Try to find English transcript, then fallback to anything
        try:
            transcript_items = api.fetch(video_id, languages=['en', 'en-US', 'en-GB']).to_raw_data()
        except Exception:
            transcript_items = api.fetch(video_id).to_raw_data()
            
        if transcript_items and len(transcript_items) > 0:
            logger.info("Transcript fetched via youtube-transcript for {}", video_id)
            segments: list[TranscriptSegment] = []
            for item in transcript_items:
                text = _clean_transcript_text((item.get("text") or "").replace("\n", " "))
                if not text:
                    continue
                start_s = float(item.get("start") or 0.0)
                duration_s = float(item.get("duration") or 0.0)
                end_s = max(start_s, start_s + duration_s)
                segments.append(TranscriptSegment(text=text, start_s=start_s, end_s=end_s))

            raw_text = _segments_to_text(segments)
            if len(raw_text.split()) < config["transcript_min_words"]:
                raise Exception("Transcript too short (likely partial); trying fallback.")
            return TranscriptResult(
                text=raw_text,
                language="en",
                is_auto_generated=True,
                segments=segments,
            )
    except Exception as e:
        logger.warning("youtube-transcript failed for {}: {}", video_id, e)

    logger.info("Trying timedtext fallback for {}...", video_id)

    # Fall back to timedtext
    timedtext_result = await fetch_transcript_via_timedtext(video_id)
    if timedtext_result:
        logger.info("Transcript fetched via timedtext for {}", video_id)
        return timedtext_result

    # Fall back to Whisper audio transcription
    logger.info("Trying Whisper fallback for {}...", video_id)
    whisper_segments = await download_and_transcribe(video_id)
    if whisper_segments:
        text = _segments_to_text(whisper_segments)
        if len(text.split()) >= config["transcript_min_words"]:
            logger.info("Transcript fetched via Whisper for {}", video_id)
            return TranscriptResult(
                text=text,
                language="en",
                is_auto_generated=True,
                segments=whisper_segments,
            )
        else:
            logger.warning("Whisper transcript too short ({} words) for {}", len(text.split()), video_id)

    logger.warning("No captions found for {}", video_id)
    error = Exception("No captions available for this video.")
    error.code = "NO_CAPTIONS"
    raise error
