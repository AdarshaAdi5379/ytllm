import asyncio
import os
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_cmd
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import config as app_config


def database_connect_args() -> dict:
    """Return SSL connect_args when the app DB_URL requests sslmode=require.

    Asyncpg reads SSL from connect_args, not from an 'sslmode' URL query
    param (passing it in the URL breaks asyncpg's connect()). This helper
    centralizes the check so the app engine (database.py) and Alembic
    (alembic/env.py) apply identical SSL handling.
    """
    if "sslmode=require" in app_config["database_url"]:
        return {"ssl": "require"}
    return {}


def database_url_without_sslmode() -> str:
    """Return the app DB URL with any trailing sslmode=... param stripped."""
    scheme, netloc, path, query, fragment = urlsplit(app_config["database_url"])
    if query:
        pairs = [p for p in query.split("&") if p and not p.startswith("sslmode=")]
        query = "&".join(pairs) if pairs else ""
    else:
        query = ""
    return urlunsplit((scheme, netloc, path, query, fragment))


engine = create_async_engine(
    database_url_without_sslmode(),
    echo=False,
    # Reconnect on stale/idle connections (managed Postgres / long-lived
    # containers) and recycle connections so restarts never surface as 500s.
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=database_connect_args(),
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def _run_alembic_migrations():
    """Run Alembic migrations in a thread to avoid nested event loop issues."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(backend_dir, "alembic.ini")

    if not os.path.isfile(ini_path):
        import logging
        logging.warning("alembic.ini not found at %s — skipping migrations", ini_path)
        return

    def _run():
        alembic_cfg = AlembicConfig(ini_path)
        alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
        alembic_cmd.upgrade(alembic_cfg, "head")

    await asyncio.to_thread(_run)


async def init_db():
    """Run Alembic migrations on startup."""
    await _run_alembic_migrations()
