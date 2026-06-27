import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Float, UniqueConstraint, Index
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# V0 models (retained for migration compatibility)
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    supabase_user_id = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    standalone_sessions = relationship("StandaloneSession", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    youtube_video_id = Column(String, nullable=False)
    title = Column(String, default="")
    channel_name = Column(String, default="")
    duration = Column(String, default="")
    thumbnail_url = Column(String, default="")
    transcript = Column(Text, default="")
    summary = Column(Text, default="")
    system_prompt = Column(Text, default="")
    custom_name = Column(String, default="")
    is_pinned = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    user = relationship("User", back_populates="videos")
    messages = relationship("ChatMessage", back_populates="video", cascade="all, delete-orphan", order_by="ChatMessage.timestamp")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=_uuid)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, default="")
    timestamp = Column(String, default="")

    video = relationship("Video", back_populates="messages")


# ---------------------------------------------------------------------------
# V1 models
# ---------------------------------------------------------------------------

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False, default="My Workspace")
    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    owner = relationship("User", back_populates="workspaces")
    folders = relationship("Folder", back_populates="workspace", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="workspace", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="workspace", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="workspace", cascade="all, delete-orphan")


class Folder(Base):
    __tablename__ = "folders"

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey("folders.id"), nullable=True, index=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace", back_populates="folders")
    children = relationship("Folder", backref="parent", remote_side="Folder.id", cascade="all, delete")
    sources = relationship("Source", back_populates="folder", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="folder", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"

    SOURCE_TYPES = (
        "youtube_video", "pdf_document", "website_page", "github_repo",
        "markdown_note", "text_note", "docx_document", "pptx_document",
    )
    STATUSES = ("queued", "processing", "ready", "error")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    folder_id = Column(String, ForeignKey("folders.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    source_type = Column(String, nullable=False)
    title = Column(String, default="")
    metadata_json = Column(Text, default="{}")
    raw_text = Column(Text, default="")
    status = Column(String, default="queued")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace", back_populates="sources")
    folder = relationship("Folder", back_populates="sources")
    user = relationship("User", back_populates="sources")
    chunks = relationship("SourceChunk", back_populates="source", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="source", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sources_source_type", "source_type"),
        Index("ix_sources_status", "status"),
    )


class SourceChunk(Base):
    __tablename__ = "source_chunks"

    id = Column(String, primary_key=True, default=_uuid)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=_now, nullable=False)

    source = relationship("Source", back_populates="chunks")

    __table_args__ = (
        Index("ix_source_chunks_source_chunk", "source_id", "chunk_index"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    folder_id = Column(String, ForeignKey("folders.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="New Chat")
    source_ids = Column(Text, default="[]")
    model = Column(String, nullable=True)
    temperature = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace", back_populates="chat_sessions")
    folder = relationship("Folder", back_populates="chat_sessions")
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessageNew", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessageNew.timestamp")


class ChatMessageNew(Base):
    __tablename__ = "chat_messages_new"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, default="")
    citations = Column(Text, default="[]")
    timestamp = Column(String, default="")

    session = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("ix_chat_messages_new_session_ts", "session_id", "timestamp"),
    )


class Note(Base):
    __tablename__ = "notes"

    DIFFICULTIES = ("beginner", "intermediate", "advanced")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, default="")
    tags = Column(Text, default="[]")
    topic = Column(String, default="")
    difficulty = Column(String, default="intermediate")
    importance = Column(Integer, default=3)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace", back_populates="notes")
    source = relationship("Source")
    user = relationship("User", back_populates="notes")

    __table_args__ = (
        Index("ix_notes_topic", "topic"),
        Index("ix_notes_difficulty", "difficulty"),
    )


class Summary(Base):
    __tablename__ = "summaries"

    SUMMARY_TYPES = ("short", "detailed", "executive", "eli5", "interview", "revision")

    id = Column(String, primary_key=True, default=_uuid)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    content = Column(Text, default="")
    created_at = Column(DateTime, default=_now, nullable=False)

    source = relationship("Source", back_populates="summaries")

    __table_args__ = (
        UniqueConstraint("source_id", "type", name="uq_summary_source_type"),
    )


class Flashcard(Base):
    __tablename__ = "flashcards"

    DIFFICULTIES = ("easy", "medium", "hard")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    difficulty = Column(String, nullable=False, default="medium")
    tags = Column(Text, default="[]")
    easiness_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    repetitions = Column(Integer, default=0)
    next_review_date = Column(DateTime, nullable=True)
    last_reviewed_at = Column(DateTime, nullable=True)
    total_reviews = Column(Integer, default=0)
    correct_reviews = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace")
    source = relationship("Source")
    user = relationship("User")

    __table_args__ = (
        Index("ix_flashcards_next_review", "next_review_date"),
        Index("ix_flashcards_difficulty", "difficulty"),
    )


class Quiz(Base):
    __tablename__ = "quizzes"

    QUIZ_TYPES = ("mcq", "coding", "short_answer", "long_answer", "case_study", "interview")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    quiz_type = Column(String, nullable=False)
    questions = Column(Text, default="[]")
    metadata_json = Column(Text, default="{}")
    time_limit_minutes = Column(Integer, nullable=True)
    score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace")
    source = relationship("Source")
    user = relationship("User")

    __table_args__ = (
        Index("ix_quizzes_quiz_type", "quiz_type"),
        Index("ix_quizzes_source_id", "source_id"),
    )


class LearningPath(Base):
    __tablename__ = "learning_paths"

    STATUSES = ("active", "completed", "archived")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    total_topics = Column(Integer, default=0)
    completed_topics = Column(Integer, default=0)
    time_spent_minutes = Column(Integer, default=0)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace")
    user = relationship("User")

    __table_args__ = (
        Index("ix_learning_paths_status", "status"),
    )


class LearningPathTopic(Base):
    __tablename__ = "learning_path_topics"

    id = Column(String, primary_key=True, default=_uuid)
    learning_path_id = Column(String, ForeignKey("learning_paths.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    source_ids = Column(Text, default="[]")
    completed = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)
    time_spent_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    learning_path = relationship("LearningPath", back_populates="topics")

    __table_args__ = (
        Index("ix_lp_topic_sort_order", "sort_order"),
    )


LearningPath.topics = relationship("LearningPathTopic", back_populates="learning_path", cascade="all, delete-orphan")


class MentorSession(Base):
    __tablename__ = "mentor_sessions"

    STATUSES = ("active", "completed")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String, nullable=False)
    source_ids = Column(Text, default="[]")
    messages = Column(Text, default="[]")
    status = Column(String, nullable=False, default="active")
    summary = Column(Text, nullable=True)
    gap_report = Column(Text, nullable=True)
    correct_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    workspace = relationship("Workspace")
    user = relationship("User")

    __table_args__ = (
        Index("ix_mentor_sessions_status", "status"),
        Index("ix_mentor_sessions_topic", "topic"),
    )


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    ROLES = ("owner", "admin", "editor", "viewer")

    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False, default="editor")
    invited_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)

    workspace = relationship("Workspace", backref="member_rels")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

class StandaloneSession(Base):
    __tablename__ = "standalone_sessions"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    guest_token = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False, default="New Chat")
    model = Column(String, nullable=True)
    temperature = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    user = relationship("User", back_populates="standalone_sessions")
    messages = relationship(
        "StandaloneMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="StandaloneMessage.timestamp",
    )
    sources = relationship("StandaloneSource", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_standalone_sessions_user_updated", "user_id", "updated_at"),
    )


class StandaloneMessage(Base):
    __tablename__ = "standalone_messages"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, ForeignKey("standalone_sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, default="")
    citations = Column(Text, default="[]")
    timestamp = Column(String, default="")

    session = relationship("StandaloneSession", back_populates="messages")

    __table_args__ = (
        Index("ix_standalone_messages_session_ts", "session_id", "timestamp"),
    )


class StandaloneSource(Base):
    __tablename__ = "standalone_sources"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, ForeignKey("standalone_sessions.id"), nullable=False, index=True)
    source_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    metadata_json = Column(Text, default="{}")
    index_key = Column(String, nullable=False, index=True)
    file_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)

    session = relationship("StandaloneSession", back_populates="sources")
