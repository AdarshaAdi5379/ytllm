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


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SavedVideoResponse(BaseModel):
    id: str
    youtube_video_id: str
    title: str
    channel_name: str
    duration: str
    thumbnail_url: str
    summary: str
    created_at: str
    message_count: int = 0


class SavedVideoDetail(BaseModel):
    id: str
    youtube_video_id: str
    title: str
    channel_name: str
    duration: str
    thumbnail_url: str
    transcript: str
    summary: str
    system_prompt: str
    messages: list[Message]


class SaveVideoRequest(BaseModel):
    youtube_video_id: str
    title: str
    channel_name: str
    duration: str
    thumbnail_url: str
    transcript: str
    summary: str
    system_prompt: str


class ApiError(BaseModel):
    error: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
