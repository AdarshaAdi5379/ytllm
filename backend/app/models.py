from pydantic import BaseModel, field_validator
from typing import Literal
import re

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


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

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not EMAIL_PATTERN.match(v.strip()):
            raise ValueError("Invalid email format")
        return v


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not EMAIL_PATTERN.match(v.strip()):
            raise ValueError("Invalid email format")
        return v


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None


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
    model: str | None = None
    temperature: float | None = None
    message_count: int = 0
    created_at: str
    updated_at: str


class CreateChatSessionRequest(BaseModel):
    title: str = "New Chat"
    source_ids: list[str] = []
    model: str | None = None
    temperature: float | None = None


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
    model: str | None = None
    temperature: float | None = None


class ApiError(BaseModel):
    error: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str


class CreateNoteRequest(BaseModel):
    workspace_id: str
    source_id: str | None = None
    content: str = ""
    tags: list[str] = []
    topic: str = ""
    difficulty: str = "intermediate"
    importance: int = 3


class UpdateNoteRequest(BaseModel):
    content: str | None = None
    tags: list[str] | None = None
    topic: str | None = None
    difficulty: str | None = None
    importance: int | None = None


class NoteResponse(BaseModel):
    id: str
    workspace_id: str
    source_id: str | None = None
    content: str
    tags: str = "[]"
    topic: str = ""
    difficulty: str = "intermediate"
    importance: int = 3
    created_at: str
    updated_at: str


class SearchResult(BaseModel):
    text: str
    source_id: str
    source_title: str
    source_type: str
    folder_id: str | None = None
    folder_name: str | None = None
    created_at: str = ""
    chunk_index: float | None = None
    start_s: float | None = None
    end_s: float | None = None
    distance: float = 1.0
    match_type: str = "vector"


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
    method: str = "vector"


class SearchRequest(BaseModel):
    workspace_id: str
    query: str
    folder_id: str | None = None
    folder_ids: list[str] | None = None
    source_type: str | None = None
    date_from: str | None = None
    date_to: str | None = None


class FlashcardResponse(BaseModel):
    id: str
    workspace_id: str
    source_id: str | None = None
    question: str
    answer: str
    difficulty: str = "medium"
    tags: str = "[]"
    easiness_factor: float = 2.5
    interval_days: int = 0
    repetitions: int = 0
    next_review_date: str | None = None
    last_reviewed_at: str | None = None
    total_reviews: int = 0
    correct_reviews: int = 0
    created_at: str
    updated_at: str


class CreateFlashcardRequest(BaseModel):
    workspace_id: str
    source_id: str | None = None
    question: str
    answer: str
    difficulty: str = "medium"
    tags: list[str] = []


class UpdateFlashcardRequest(BaseModel):
    question: str | None = None
    answer: str | None = None
    difficulty: str | None = None
    tags: list[str] | None = None


class GenerateFlashcardsRequest(BaseModel):
    source_id: str
    count: int = 10


class ReviewFlashcardRequest(BaseModel):
    rating: int  # 0=again, 1=hard, 2=good, 3=easy


class ReviewQueueItem(BaseModel):
    id: str
    workspace_id: str
    source_id: str | None = None
    question: str
    answer: str
    difficulty: str
    tags: str = "[]"
    easiness_factor: float = 2.5
    interval_days: int = 0
    repetitions: int = 0
    next_review_date: str | None = None
    last_reviewed_at: str | None = None
    total_reviews: int = 0
    correct_reviews: int = 0


class QuizResponse(BaseModel):
    id: str
    workspace_id: str
    source_id: str | None = None
    title: str
    quiz_type: str
    questions: str = "[]"
    metadata_json: str = "{}"
    time_limit_minutes: int | None = None
    score: int | None = None
    max_score: int | None = None
    completed_at: str | None = None
    created_at: str
    updated_at: str


class CreateQuizRequest(BaseModel):
    workspace_id: str
    source_id: str | None = None
    title: str
    quiz_type: str = "mcq"
    questions: str = "[]"
    time_limit_minutes: int | None = None


class GenerateQuizRequest(BaseModel):
    source_id: str
    quiz_type: str = "mcq"
    count: int = 5
    time_limit_minutes: int | None = None


class SubmitQuizAnswer(BaseModel):
    question_id: str
    answer: str | int | None = None


class SubmitQuizRequest(BaseModel):
    answers: list[SubmitQuizAnswer]


class LearningPathTopicResponse(BaseModel):
    id: str
    learning_path_id: str
    title: str
    description: str = ""
    sort_order: int = 0
    source_ids: str = "[]"
    completed: int = 0
    completed_at: str | None = None
    time_spent_minutes: int = 0
    created_at: str
    updated_at: str


class LearningPathResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    description: str = ""
    total_topics: int = 0
    completed_topics: int = 0
    time_spent_minutes: int = 0
    status: str = "active"
    topics: list[LearningPathTopicResponse] = []
    created_at: str
    updated_at: str


class GeneratePathRequest(BaseModel):
    workspace_id: str
    title: str = ""
    focus_area: str = ""


class UpdatePathTopicRequest(BaseModel):
    completed: int | None = None
    time_spent_minutes: int | None = None


class UpdatePathRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class MentorMessage(BaseModel):
    role: str  # "ai" | "user"
    content: str
    evaluation: str | None = None  # "correct" | "partial" | "incorrect"


class MentorSessionResponse(BaseModel):
    id: str
    workspace_id: str
    topic: str
    source_ids: str = "[]"
    messages: str = "[]"
    status: str = "active"
    summary: str | None = None
    gap_report: str | None = None
    correct_count: int = 0
    total_questions: int = 0
    created_at: str
    updated_at: str


class StartMentorSessionRequest(BaseModel):
    workspace_id: str
    topic: str
    source_ids: list[str] = []
    context: str = ""


class MentorRespondRequest(BaseModel):
    session_id: str
    answer: str

class StandaloneSessionResponse(BaseModel):
    id: str
    title: str
    model: str | None = None
    temperature: float | None = None
    message_count: int = 0
    source_count: int = 0
    created_at: str
    updated_at: str


class CreateStandaloneSessionRequest(BaseModel):
    title: str = "New Chat"
    model: str | None = None
    temperature: float | None = None
    guest_token: str | None = None


class UpdateStandaloneSessionRequest(BaseModel):
    title: str | None = None


class StandaloneSourceResponse(BaseModel):
    id: str
    session_id: str
    source_type: str
    title: str
    metadata_json: str = "{}"
    file_name: str | None = None
    created_at: str


class StandaloneChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    citations: str = "[]"
    timestamp: str = ""


class StandaloneChatRequest(BaseModel):
    question: str
    chat_history: list[StandaloneChatMessage] = []
    model: str | None = None
    temperature: float | None = None


class MoveToWorkspaceRequest(BaseModel):
    workspace_id: str
    folder_id: str | None = None


class ClaimGuestSessionsRequest(BaseModel):
    guest_token: str
