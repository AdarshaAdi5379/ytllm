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
    confirm_password: str = ""


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
    custom_name: str = ""
    is_pinned: bool = False
    created_at: str
    message_count: int = 0


class UpdateVideoRequest(BaseModel):
    custom_name: str | None = None
    is_pinned: bool | None = None


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
    custom_name: str = ""
    is_pinned: bool = False
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
    custom_name: str = ""
    is_pinned: bool = False


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str


class CreateWorkspaceRequest(BaseModel):
    name: str = "My Workspace"


class UpdateWorkspaceRequest(BaseModel):
    name: str


class FolderResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    parent_id: str | None = None
    sort_order: int = 0
    created_at: str
    updated_at: str


class CreateFolderRequest(BaseModel):
    name: str
    parent_id: str | None = None


class UpdateFolderRequest(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    parent_id: str | None = None


class FolderTreeItem(BaseModel):
    id: str
    name: str
    parent_id: str | None = None
    sort_order: int = 0
    children: list["FolderTreeItem"] = []
    source_count: int = 0


class SourceResponse(BaseModel):
    id: str
    workspace_id: str
    folder_id: str | None = None
    source_type: str
    title: str
    metadata_json: str = "{}"
    raw_text: str = ""
    status: str = "ready"
    error_message: str | None = None
    created_at: str
    updated_at: str


class YouTubeImportRequest(BaseModel):
    url: str
    workspace_id: str
    folder_id: str | None = None


class WebsiteImportRequest(BaseModel):
    url: str
    workspace_id: str
    folder_id: str | None = None


class ChatSessionResponse(BaseModel):
    id: str
    workspace_id: str
    folder_id: str | None = None
    title: str
    source_ids: str = "[]"
    message_count: int = 0
    created_at: str
    updated_at: str


class CreateChatSessionRequest(BaseModel):
    title: str = "New Chat"
    source_ids: list[str] = []


class UpdateChatSessionRequest(BaseModel):
    title: str | None = None


class WorkspaceChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str = ""


class WorkspaceChatRequest(BaseModel):
    session_id: str | None = None
    question: str
    chat_history: list[WorkspaceChatMessage] = []
    source_ids: list[str] | None = None
    folder_id: str | None = None


class ApiError(BaseModel):
    error: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
