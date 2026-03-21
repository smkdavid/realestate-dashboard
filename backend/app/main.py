"""
부동산 투자 대시보드 - FastAPI 메인
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import init_db
from app.scheduler import start as start_scheduler, stop as stop_scheduler
from app.api import price_index, living_index, economy, supply, admin, upload

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_index.router,  prefix="/api/v1")
app.include_router(living_index.router, prefix="/api/v1")
app.include_router(economy.router,      prefix="/api/v1")
app.include_router(supply.router,       prefix="/api/v1")
app.include_router(admin.router,        prefix="/api/v1")
app.include_router(upload.router,       prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
