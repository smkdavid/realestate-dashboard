"""
국토교통부 Open API 수집기
- 인허가, 미분양, 거래량, 외지인거래
API 키 발급: https://www.data.go.kr
"""
import httpx
import logging
from datetime import date
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

REGION_CODES = {
    "11": "서울", "41": "경기", "23": "인천",
    "26": "부산", "27": "대구", "28": "광주",
    "29": "대전", "30": "울산", "36": "세종",
}


async def fetch_unsold(yyyymm: str) -> list[dict]:
    """미분양 현황"""
    results = []
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://apis.data.go.kr/1613000/AptUnsoldInfoSvc/getAptUnsoldInfo",
                params={
                    "serviceKey": settings.MOLIT_API_KEY,
                    "pageNo": "1", "numOfRows": "100",
                    "type": "json", "baseDt": yyyymm,
                },
            )
            resp.raise_for_status()
            items = resp.json().get("body", {}).get("items", {}).get("item", [])
            for item in items:
                sido = item.get("rgnCd", "")[:2]
                results.append({
                    "ref_date":    f"{yyyymm[:4]}-{yyyymm[4:6]}-01",
                    "region_code": sido,
                    "region_name": REGION_CODES.get(sido, sido),
                    "data_type":   "unsold",
                    "value":       float(item.get("unsldHoCnt", 0) or 0),
                })
        logger.info(f"미분양 수집 완료: {len(results)}건")
    except Exception as e:
        logger.error(f"미분양 수집 실패: {e}")
    return results


async def fetch_trade_volume(yyyymm: str, region_code: str) -> list[dict]:
    """거래량"""
    results = []
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
                params={
                    "serviceKey": settings.MOLIT_API_KEY,
                    "pageNo": "1", "numOfRows": "1000",
                    "type": "json",
                    "LAWD_CD": region_code,
                    "DEAL_YMD": yyyymm,
                },
            )
            resp.raise_for_status()
            items = resp.json().get("body", {}).get("items", {}).get("item", [])
            results.append({
                "ref_date":    f"{yyyymm[:4]}-{yyyymm[4:6]}-01",
                "region_code": region_code[:2],
                "region_name": REGION_CODES.get(region_code[:2], region_code),
                "data_type":   "trade_volume",
                "value":       float(len(items)),
            })
    except Exception as e:
        logger.error(f"거래량 수집 실패: {region_code} - {e}")
    return results


async def run_all() -> dict:
    """모든 국토부 데이터 수집"""
    logger.info("=== 국토교통부 데이터 수집 시작 ===")
    today = date.today()
    yyyymm = f"{today.year}{today.month:02d}"

    unsold = await fetch_unsold(yyyymm)
    logger.info(f"=== 국토부 수집 완료 ===")
    return {"unsold": unsold}
