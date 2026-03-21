from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# SQLite vs PostgreSQL 자동 감지
_db_url = settings.DATABASE_URL
_is_sqlite = _db_url.startswith("sqlite")

if _is_sqlite:
    engine = create_async_engine(
        _db_url,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        settings.async_database_url,
        echo=settings.DEBUG,
        pool_size=10,
        max_overflow=20,
    )

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# scheduler.py 에서 사용하는 alias
async_session_maker = AsyncSessionLocal


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """앱 시작 시 테이블 자동 생성"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
