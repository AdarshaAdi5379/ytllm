import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, UniqueConstraint, Index
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
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=_now, nullable=False)

    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
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
    children = relationship("Folder", backref="parent", remote_side="Folder.id", cascade="all, delete-orphan")
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
