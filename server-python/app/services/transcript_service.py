import httpx
import re
from typing import Any
from youtube_transcript_api import YouTubeTranscriptApi

from app.config import config
from app.utils.retry import retry
from app.utils.chunk_segments import TranscriptSegment


YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


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
    """Fetches video metadata from YouTube Data API v3."""
    try:

        async def _fetch():
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{YOUTUBE_API_BASE}/videos",
                    params={
                        "key": config["google_api_key"],
                        "id": video_id,
                        "part": "snippet,contentDetails",
                    },
                )
                response.raise_for_status()
                return response.json()

        data = await retry(_fetch, max_attempts=3)

        items = data.get("items", [])
        if not items:
            raise Exception(f"Video not found: {video_id}")

        item = items[0]
        snippet = item["snippet"]
        content_details = item["contentDetails"]

        return VideoMetadata(
            title=snippet["title"],
            channel_name=snippet["channelTitle"],
            duration=_format_duration(content_details["duration"]),
            thumbnail_url=(
                snippet.get("thumbnails", {}).get("maxres", {}).get("url")
                or snippet.get("thumbnails", {}).get("high", {}).get("url")
                or snippet.get("thumbnails", {}).get("medium", {}).get("url")
                or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            ),
        )
    except Exception as e:
        print(f"Data API failed for metadata ({video_id}), trying fallback...")
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
        except Exception as fallback_err:
            print(f"Fallback metadata fetch failed: {fallback_err}")
            return VideoMetadata(
                title="Unknown Video",
                channel_name="Unknown Channel",
                duration="0:00",
                thumbnail_url=f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            )


def _format_duration(iso_duration: str) -> str:
    """Converts ISO 8601 duration (PT1H2M30S) to human-readable format."""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return "0:00"

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)

    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


async def fetch_transcript_via_data_api(video_id: str) -> TranscriptResult | None:
    """Fetches transcript via YouTube Data API v3 captions."""
    try:
        async with httpx.AsyncClient() as client:
            list_response = await client.get(
                f"{YOUTUBE_API_BASE}/captions",
                params={
                    "key": config["google_api_key"],
                    "videoId": video_id,
                    "part": "snippet",
                },
            )
            list_response.raise_for_status()
            list_data = list_response.json()
            captions = list_data.get("items", [])

            if not captions:
                return None

            # Sort by preference: manual over auto, English over other
            sorted_captions = sorted(
                captions,
                key=lambda c: (
                    0 if c["snippet"]["trackKind"] == "standard" else 1,
                    0 if c["snippet"]["language"].startswith("en") else 1,
                ),
            )

            track = sorted_captions[0]
            is_auto_generated = track["snippet"]["trackKind"] != "standard"

            # Try to download caption
            download_response = await client.get(
                f"{YOUTUBE_API_BASE}/captions/{track['id']}",
                params={
                    "key": config["google_api_key"],
                    "tfmt": "vtt",
                },
            )
            download_response.raise_for_status()

            segments = _parse_vtt_to_segments(download_response.text)
            text = _segments_to_text(segments)
            if len(text.split()) < config["transcript_min_words"]:
                return None

            return TranscriptResult(
                text=text,
                language=track["snippet"]["language"],
                is_auto_generated=is_auto_generated,
                segments=segments,
            )
    except Exception:
        return None


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
                print(f"Available caption languages for {video_id}: {available_langs}")
    except Exception as e:
        print(f"Failed to list captions for {video_id}: {e}")

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
                            print(
                                f"Found captions via timedtext ({lang}) for {video_id}"
                            )
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
                        print(f"Found captions via timedtext ({lang}) for {video_id}")
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
    print(f"Fetching transcript for video: {video_id}")

    # Try youtube-transcript library
    try:
        api = YouTubeTranscriptApi()
        # Try to find English transcript, then fallback to anything
        try:
            transcript_items = api.fetch(video_id, languages=['en', 'en-US', 'en-GB']).to_raw_data()
        except Exception:
            transcript_items = api.fetch(video_id).to_raw_data()
            
        if transcript_items and len(transcript_items) > 0:
            print(f"Transcript fetched via youtube-transcript for {video_id}")
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
        print(f"youtube-transcript failed for {video_id}: {e}")

    print(f"Trying timedtext fallback for {video_id}...")

    # Fall back to timedtext
    timedtext_result = await fetch_transcript_via_timedtext(video_id)
    if timedtext_result:
        print(f"Transcript fetched via timedtext for {video_id}")
        return timedtext_result

    print(f"Trying Data API captions fallback for {video_id}...")
    data_api_result = await fetch_transcript_via_data_api(video_id)
    if data_api_result:
        print(f"Transcript fetched via Data API for {video_id}")
        return data_api_result

    print(f"No captions found for {video_id}")
    error = Exception("No captions available for this video.")
    error.code = "NO_CAPTIONS"
    raise error
