"""v0_to_v1_migration

Migrates data from V0 tables (users, videos, chat_messages) to V1 schema
(workspaces, sources, chat_sessions, chat_messages_new).

Revision ID: e251248d244c
Revises: 6c24d2dbf94d
Create Date: 2026-06-20 18:41:40

"""
import uuid
import json
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision: str = 'e251248d244c'
down_revision: Union[str, Sequence[str], None] = '6c24d2dbf94d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _uuid() -> str:
    return str(uuid.uuid4())


def upgrade() -> None:
    conn = op.get_bind()

    # ---- 1. Ensure every user has a default workspace ----
    users = conn.execute(sa.text("SELECT id, email, created_at FROM users")).fetchall()
    existing = {r[0] for r in conn.execute(sa.text("SELECT owner_id FROM workspaces")).fetchall()}

    for uid, email, created_at in users:
        if uid in existing:
            continue
        now = datetime.utcnow()
        conn.execute(
            sa.text(
                "INSERT INTO workspaces (id, name, owner_id, created_at, updated_at) "
                "VALUES (:id, :name, :owner_id, :created_at, :updated_at)"
            ),
            {
                "id": _uuid(),
                "name": "My Workspace",
                "owner_id": uid,
                "created_at": now,
                "updated_at": now,
            },
        )

    # ---- 2. Migrate videos → Source records ----
    videos = conn.execute(
        sa.text("SELECT id, user_id, youtube_video_id, title, channel_name, duration, thumbnail_url, "
                "transcript, summary, system_prompt, custom_name, created_at, updated_at FROM videos")
    ).fetchall()

    for v in videos:
        vid, user_id, youtube_video_id, title, channel_name, duration, thumbnail_url, \
            transcript, summary, system_prompt, custom_name, created_at, updated_at = v

        # Find the user's default workspace
        ws = conn.execute(
            sa.text("SELECT id FROM workspaces WHERE owner_id = :uid LIMIT 1"),
            {"uid": user_id},
        ).fetchone()
        if not ws:
            continue
        workspace_id = ws[0]

        metadata = {}
        if youtube_video_id:
            metadata["video_id"] = youtube_video_id
        if channel_name:
            metadata["channel_name"] = channel_name
        if duration:
            metadata["duration"] = duration
        if thumbnail_url:
            metadata["thumbnail_url"] = thumbnail_url
        if custom_name:
            metadata["custom_name"] = custom_name

        conn.execute(
            sa.text(
                "INSERT INTO sources (id, workspace_id, user_id, source_type, title, "
                "metadata_json, raw_text, status, created_at, updated_at) "
                "VALUES (:id, :workspace_id, :user_id, :source_type, :title, "
                ":metadata_json, :raw_text, :status, :created_at, :updated_at)"
            ),
            {
                "id": vid,
                "workspace_id": workspace_id,
                "user_id": user_id,
                "source_type": "youtube_video",
                "title": title or custom_name or youtube_video_id or "",
                "metadata_json": json.dumps(metadata),
                "raw_text": transcript or "",
                "status": "ready",
                "created_at": created_at,
                "updated_at": updated_at,
            },
        )

        # Migrate summary if present
        if summary and summary.strip():
            conn.execute(
                sa.text(
                    "INSERT INTO summaries (id, source_id, type, content, created_at) "
                    "VALUES (:id, :source_id, :type, :content, :created_at)"
                ),
                {
                    "id": _uuid(),
                    "source_id": vid,
                    "type": "detailed",
                    "content": summary,
                    "created_at": created_at,
                },
            )

    # ---- 3. Group chat messages by video → ChatSession + ChatMessageNew ----
    messages = conn.execute(
        sa.text("SELECT id, video_id, role, content, timestamp FROM chat_messages ORDER BY video_id, timestamp")
    ).fetchall()

    # Group messages by video_id
    sessions = {}
    for msg_id, video_id, role, content, timestamp in messages:
        if video_id not in sessions:
            # Get workspace_id from the source we just created
            src = conn.execute(
                sa.text("SELECT workspace_id, user_id, created_at FROM sources WHERE id = :sid"),
                {"sid": video_id},
            ).fetchone()
            if not src:
                continue
            workspace_id, user_id, created_at = src
            sessions[video_id] = {
                "session_id": _uuid(),
                "workspace_id": workspace_id,
                "user_id": user_id,
                "created_at": created_at,
            }
            now = datetime.utcnow()
            conn.execute(
                sa.text(
                    "INSERT INTO chat_sessions (id, workspace_id, user_id, title, source_ids, "
                    "created_at, updated_at) VALUES (:id, :workspace_id, :user_id, :title, "
                    ":source_ids, :created_at, :updated_at)"
                ),
                {
                    "id": sessions[video_id]["session_id"],
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                    "title": f"Chat - {timestamp or created_at}",
                    "source_ids": json.dumps([video_id]),
                    "created_at": now,
                    "updated_at": now,
                },
            )

        session_id = sessions[video_id]["session_id"]
        conn.execute(
            sa.text(
                "INSERT INTO chat_messages_new (id, session_id, role, content, citations, timestamp) "
                "VALUES (:id, :session_id, :role, :content, :citations, :timestamp)"
            ),
            {
                "id": msg_id,
                "session_id": session_id,
                "role": role,
                "content": content or "",
                "citations": "[]",
                "timestamp": timestamp or "",
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM chat_messages_new"))
    conn.execute(sa.text("DELETE FROM chat_sessions"))
    conn.execute(sa.text("DELETE FROM summaries"))
    conn.execute(sa.text("DELETE FROM sources"))
    conn.execute(sa.text("DELETE FROM workspaces"))
