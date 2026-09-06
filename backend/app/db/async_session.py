from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import DATABASE_URL

# Convert postgresql:// to postgresql+asyncpg:// or sqlite:// to sqlite+aiosqlite://
if DATABASE_URL.startswith("sqlite"):
    ASYNC_SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")
    connect_args = {"check_same_thread": False}
    extra_engine_args = {}
else:
    ASYNC_SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    connect_args = {"statement_cache_size": 0}
    extra_engine_args = {"pool_size": 3, "max_overflow": 2}

async_engine = create_async_engine(
    ASYNC_SQLALCHEMY_DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args,
    **extra_engine_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
