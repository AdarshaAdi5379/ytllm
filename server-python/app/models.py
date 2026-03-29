from pydantic import BaseModel
from typing import Literal


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class VideoMeta(BaseModel):
    video_id: str
    title: str
    channel_name: str
    duration: str
    thumbnail_url: str


class TranscriptResponse(BaseModel):
    video_id: str
    title: str
    channel_name: str
    duration: str
    thumbnail_url: str
    transcript: str
    summary: str
    suggested_questions: list[str]
    chunk_count: int
    system_prompt: str = ""


class ChatRequest(BaseModel):
    video_id: str
    question: str
    chat_history: list[Message] = []
    system_prompt: str = ""


class TranscriptRequest(BaseModel):
    url: str


class ExportRequest(BaseModel):
    video_id: str
    format: Literal["pdf", "docx"]
    include_transcript: bool = False
    chat_history: list[Message] = []


class ApiError(BaseModel):
    error: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
