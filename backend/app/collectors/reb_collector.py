"""
한국부동산원 Open API 수집기
API 키 발급: https://www.data.go.kr 에서 '한국부동산원' 검색
"""
import httpx
import logging
from datetime import date, timedelta
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

BASE_URL = "https://apis.data.go.kr/1611000/AptPriceIndexSvc"

# ── 지역 코드 (주요 지역)
REGION_CODES = {
    "0000": "전국",
    "1100": "서울",
    "4100": "경기",
    "2300": "인천",
    "2600": "부산",
    "2700": "대구",
    "2800": "광주",
    "2900": "대전",
    "3000": "울산",
    "3600": "세종",
}


async def fetch_weekly_buy_index(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list[dict]:
    """주간 매매가격지수 수집"""
    if not end_date:
        end_date = date.today().strftime("%Y%m%d")
    if not start_date:
        start_date = (date.today() - timedelta(weeks=4)).strftime("%Y%m%d")

    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        for code, name in REGION_CODES.items():
            try:
                resp = await client.get(
                    f"{BASE_URL}/getAptPriceIndex",
                    params={
                        "serviceKey": settings.REB_API_KEY,
                        "numOfRows": "100",
                        "pageNo": "1",
                        "type": "json",
                        "cortarNo": code,
                        "startmonth": start_date[:6],
                        "endmonth": end_date[:6],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                items = data.get("body", {}).get("items", {}).get("item", [])
                for item in items:
                    results.append({
                        "region_code": code,
                        "region_name": name,
                        "survey_date": item.get("baseDt"),
                        "price_type": "buy",
                        "index_value": float(item.get("buyPriceIndex", 0) or 0),
                        "weekly_change": float(item.get("weeklyChangeRate", 0) or 0),
                    })
                logger.info(f"REB 매매지수 수집 완료: {name} ({len(items)}건)")
            except Exception as e:
                logger.error(f"REB 매매지수 수집 실패: {name} - {e}")

    return results


async def fetch_weekly_rent_index(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list[dict]:
    """주간 전세가격지수 수집"""
    if not end_date:
        end_date = date.today().strftime("%Y%m%d")
    if not start_date:
        start_date = (date.today() - timedelta(weeks=4)).strftime("%Y%m%d")

    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        for code, name in REGION_CODES.items():
            try:
                resp = await client.get(
                    f"{BASE_URL}/getAptJeonsePriceIndex",
                    params={
                        "serviceKey": settings.REB_API_KEY,
                        "numOfRows": "100",
                        "pageNo": "1",
                        "type": "json",
                        "cortarNo": code,
                        "startmonth": start_date[:6],
                        "endmonth": end_date[:6],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                items = data.get("body", {}).get("items", {}).get("item", [])
                for item in items:
                    results.append({
                        "region_code": code,
                        "region_name": name,
                        "survey_date": item.get("baseDt"),
                        "price_type": "rent",
                        "index_value": float(item.get("rentPriceIndex", 0) or 0),
                        "weekly_change": float(item.get("weeklyChangeRate", 0) or 0),
                    })
            except Exception as e:
                logger.error(f"REB 전세지수 수집 실패: {name} - {e}")

    return results


async def fetch_jeonse_ratio() -> list[dict]:
    """전세가율 (매매가격 대비 전세가격 비율)"""
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        for code, name in REGION_CODES.items():
            try:
                resp = await client.get(
                    f"{BASE_URL}/getAptJeonsePriceRatio",
                    params={
                        "serviceKey": settings.REB_API_KEY,
                        "numOfRows": "12",
                        "pageNo": "1",
                        "type": "json",
                        "cortarNo": code,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                items = data.get("body", {}).get("items", {}).get("item", [])
                for item in items:
                    results.append({
                        "region_code": code,
                        "region_name": name,
                        "survey_date": item.get("baseDt"),
                        "jeonse_ratio": float(item.get("rentRatio", 0) or 0),
                    })
            except Exception as e:
                logger.error(f"REB 전세가율 수집 실패: {name} - {e}")

    return results


async def run_all() -> dict:
    """모든 부동산원 데이터 수집 (매일 10시 호출)"""
    logger.info("=== 한국부동산원 데이터 수집 시작 ===")
    buy_data = await fetch_weekly_buy_index()
    rent_data = await fetch_weekly_rent_index()
    jeonse_data = await fetch_jeonse_ratio()
    logger.info(f"=== 부동산원 수집 완료: 매매 {len(buy_data)}건, 전세 {len(rent_data)}건 ===")
    return {
        "buy_index": buy_data,
        "rent_index": rent_data,
        "jeonse_ratio": jeonse_data,
    }
