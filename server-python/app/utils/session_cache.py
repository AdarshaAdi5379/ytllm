from cachetools import TTLCache
from typing import Any

from app.config import config


class SessionData:
    transcript: str
    video_id: str
    title: str
    channel_name: str
    duration: str
    thumbnail_url: str
    summary: str

    def __init__(
        self,
        video_id: str,
        transcript: str,
        title: str,
        channel_name: str,
        duration: str,
        thumbnail_url: str,
        summary: str,
    ):
        self.video_id = video_id
        self.transcript = transcript
        self.title = title
        self.channel_name = channel_name
        self.duration = duration
        self.thumbnail_url = thumbnail_url
        self.summary = summary


cache = TTLCache(maxsize=100, ttl=config["session_cache_ttl"])


class SessionCache:
    @staticmethod
    def set(video_id: str, data: dict) -> None:
        cache[video_id] = SessionData(
            video_id=data["video_id"],
            transcript=data["transcript"],
            title=data["title"],
            channel_name=data["channel_name"],
            duration=data["duration"],
            thumbnail_url=data["thumbnail_url"],
            summary=data["summary"],
        )

    @staticmethod
    def get(video_id: str) -> SessionData | None:
        return cache.get(video_id)

    @staticmethod
    def delete(video_id: str) -> None:
        cache.pop(video_id, None)

    @staticmethod
    def has(video_id: str) -> bool:
        return video_id in cache


session_cache = SessionCache()
