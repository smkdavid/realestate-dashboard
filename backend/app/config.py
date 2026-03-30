import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# ── 글로벌 .env 선택적 로드
# 로컬 .env에 키가 있지만 값이 비어있을 때만 글로벌(Projects/.env)에서 채움
# 로컬 .env에 키 자체가 없으면 글로벌에서 가져오지 않음 (프로젝트에 불필요한 키)
try:
    from dotenv import load_dotenv
    _backend_dir = Path(__file__).resolve().parent.parent   # backend/
    _local_env = _backend_dir / ".env"
    load_dotenv(_local_env)                                 # 로컬 먼저 로드

    # 로컬 .env에서 빈 값인 키 목록 수집
    # 'KEY=' 또는 'KEY' (= 없이 키만 있는 경우) 모두 공란으로 처리
    _empty_keys = set()
    if _local_env.exists():
        with open(_local_env, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if not _line or _line.startswith("#"):
                    continue
                if "=" in _line:
                    _k, _v = _line.split("=", 1)
                    if not _v.strip() and not os.environ.get(_k.strip()):
                        _empty_keys.add(_k.strip())
                else:
                    # '=' 없이 키 이름만 있는 경우도 공란으로 간주
                    _k = _line.strip()
                    if _k and not os.environ.get(_k):
                        _empty_keys.add(_k)

    # 빈 키가 있을 때만 글로벌 .env에서 해당 키만 가져옴
    if _empty_keys:
        for _p in _backend_dir.parents:
            _g = _p / ".env"
            if _g.exists() and _g != _local_env:
                with open(_g, "r", encoding="utf-8") as _f:
                    for _line in _f:
                        _line = _line.strip()
                        if _line and not _line.startswith("#") and "=" in _line:
                            _k, _v = _line.split("=", 1)
                            if _k.strip() in _empty_keys and _v.strip():
                                os.environ[_k.strip()] = _v.strip()
                break
except ImportError:
    pass


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
