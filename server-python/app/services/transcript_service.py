import httpx
import re
from typing import Any
from youtube_transcript_api import YouTubeTranscriptApi

from app.config import config
from app.utils.retry import retry


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
    def __init__(self, text: str, language: str, is_auto_generated: bool):
        self.text = text
        self.language = language
        self.is_auto_generated = is_auto_generated


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

            text = _parse_vtt(download_response.text)
            if len(text.split()) < config["transcript_min_words"]:
                return None

            return TranscriptResult(
                text=text,
                language=track["snippet"]["language"],
                is_auto_generated=is_auto_generated,
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
                        text = _parse_vtt(response.text)
                        if len(text.split()) >= config["transcript_min_words"]:
                            print(
                                f"Found captions via timedtext ({lang}) for {video_id}"
                            )
                            return TranscriptResult(
                                text=text,
                                language=lang,
                                is_auto_generated="asr=1" in url,
                            )
                except Exception:
                    continue

        # Try available languages
        for lang in available_langs:
            try:
                url = f"https://www.youtube.com/api/timedtext?v={video_id}&lang={lang}&fmt=vtt"
                response = await client.get(url, headers=base_headers, timeout=10.0)
                if response.text and len(response.text) > 50:
                    text = _parse_vtt(response.text)
                    if len(text.split()) >= config["transcript_min_words"]:
                        print(f"Found captions via timedtext ({lang}) for {video_id}")
                        return TranscriptResult(
                            text=text,
                            language=lang,
                            is_auto_generated=True,
                        )
            except Exception:
                continue

    return None


def _parse_vtt(vtt_content: str) -> str:
    """Parses VTT caption file into clean plain text."""
    lines = vtt_content.split("\n")
    text_lines = []
    last_line = ""

    for line in lines:
        trimmed = line.strip()

        # Skip headers, timestamps, etc.
        if (
            trimmed == "WEBVTT"
            or trimmed.startswith("NOTE")
            or trimmed.startswith("STYLE")
            or re.match(r"^\d{2}:\d{2}:\d{2}", trimmed)
            or re.match(r"^\d{2}:\d{2}[\.,]", trimmed)
            or re.match(r"^-->", trimmed)
        ):
            continue

        # Skip pure numeric cue IDs
        if re.match(r"^\d+$", trimmed):
            continue

        if trimmed and trimmed != last_line:
            # Remove HTML tags
            cleaned = re.sub(r"<[^>]+>", "", trimmed).strip()
            if cleaned:
                text_lines.append(cleaned)
                last_line = trimmed

    return _clean_transcript_text(" ".join(text_lines))


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
            raw_text = " ".join(item["text"] for item in transcript_items)
            if len(raw_text.split()) < config["transcript_min_words"]:
                raise Exception("Transcript too short (likely partial); trying fallback.")
            return TranscriptResult(
                text=_clean_transcript_text(raw_text),
                language="en",
                is_auto_generated=True,
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
