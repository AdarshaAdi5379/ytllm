import re


def extract_video_id(input_str: str) -> str | None:
    """
    Extracts a YouTube video ID from any supported URL format.

    Supports:
      - https://www.youtube.com/watch?v=VIDEO_ID
      - https://youtu.be/VIDEO_ID
      - https://www.youtube.com/embed/VIDEO_ID
      - https://www.youtube.com/watch?v=VIDEO_ID&t=120s
      - VIDEO_ID (bare 11-character ID)
    """
    trimmed = input_str.strip()

    # Bare 11-character video ID
    if re.match(r"^[a-zA-Z0-9_-]{11}$", trimmed):
        return trimmed

    # Full URL patterns
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, trimmed)
        if match and match.group(1):
            return match.group(1)

    return None


def is_valid_youtube_url(input_str: str) -> bool:
    """Check if the input is a valid YouTube URL."""
    return extract_video_id(input_str) is not None
