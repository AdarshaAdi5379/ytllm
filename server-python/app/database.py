from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import config


engine = create_async_engine(config["database_url"], echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from app.db_models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


from sqlalchemy import text


async def run_migrations():
    """Add new columns that may not exist yet (idempotent)."""
    async with engine.begin() as conn:
        for col, col_type in [("custom_name", "VARCHAR(255) DEFAULT ''"), ("is_pinned", "INTEGER DEFAULT 0")]:
            try:
                await conn.execute(text(f"ALTER TABLE videos ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
