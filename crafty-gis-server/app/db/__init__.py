"""
CRAFTY GIS — Database initialization
Async SQLAlchemy with PostGIS support for geospatial queries.
"""

import logging
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


engine = None
async_session_maker = None


async def init_db(database_url: Optional[str] = None):
    """Initialize database connection with PostGIS support."""
    global engine, async_session_maker
    
    db_url = database_url or settings.DATABASE_URL
    
    if not db_url or db_url == "sqlite+aiosqlite:///./crafty_gis.db":
        # Use SQLite for development (no PostGIS)
        logger.info("Using SQLite database (development mode)")
        engine = create_async_engine(
            db_url or "sqlite+aiosqlite:///./crafty_gis.db",
            echo=settings.DB_ECHO,
        )
    else:
        # Use PostgreSQL with PostGIS
        logger.info(f"Using PostgreSQL database")
        engine = create_async_engine(
            db_url,
            echo=settings.DB_ECHO,
            pool_size=10,
            max_overflow=20,
        )
    
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Enable PostGIS if using PostgreSQL
        if "postgresql" in (database_url or settings.DATABASE_URL or ""):
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology"))
                logger.info("PostGIS extensions enabled")
            except Exception as e:
                logger.warning(f"Could not enable PostGIS: {e}")
    
    logger.info("Database initialized successfully")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    if async_session_maker is None:
        await init_db()
    
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db():
    """Close database connection."""
    if engine:
        await engine.dispose()
        logger.info("Database connection closed")
