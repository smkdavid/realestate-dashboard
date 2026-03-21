from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── 앱 기본
    APP_NAME: str = "부동산 투자 대시보드"
    DEBUG: bool = False

    # ── 데이터베이스 (로컬 Docker or Render)
    DATABASE_URL: str = "postgresql+asyncpg://realestate:realestate@localhost:5432/realestate"

    @property
    def async_database_url(self) -> str:
        """Render는 postgres:// 를 주지만 asyncpg는 postgresql+asyncpg:// 필요"""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # ── Redis
    REDIS_URL: str = "redis://localhost:6379"

    # ── API 키 (공공데이터포털 / 각 기관에서 무료 발급)
    REB_API_KEY: str = ""          # 한국부동산원 (data.go.kr)
    ECOS_API_KEY: str = ""         # 한국은행 ECOS
    MOLIT_API_KEY: str = ""        # 국토교통부 (data.go.kr)
    KOSIS_API_KEY: str = ""        # 통계청 KOSIS
    MOIS_API_KEY: str = ""         # 행정안전부 (data.go.kr)
    NAVER_MAP_CLIENT_ID: str = ""  # 네이버 클라우드 플랫폼

    # ── 수집 스케줄 (매일 오전 10시)
    COLLECT_HOUR: int = 10
    COLLECT_MINUTE: int = 0

    # ── CORS (프론트 주소)
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "https://*.vercel.app",    # Vercel 배포 시
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
