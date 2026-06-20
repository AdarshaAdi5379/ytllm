import os
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_cmd
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import config as app_config


engine = create_async_engine(app_config["database_url"], echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


def _run_alembic_migrations():
    """Run Alembic migrations synchronously (handles SQLite sync path internally)."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(backend_dir, "alembic.ini")

    if not os.path.isfile(ini_path):
        import logging
        logging.warning("alembic.ini not found at %s — skipping migrations", ini_path)
        return

    alembic_cfg = AlembicConfig(ini_path)
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    alembic_cmd.upgrade(alembic_cfg, "head")


async def init_db():
    """Run Alembic migrations on startup."""
    _run_alembic_migrations()
