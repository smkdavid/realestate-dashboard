"""
KB부동산 데이터허브 API 수집기
https://data-api.kbland.kr 에서 직접 데이터를 수집합니다.
인증키 불필요 — PublicDataReader 패턴 기반 직접 HTTP 호출
"""
import logging
import asyncio
from datetime import date, datetime
from typing import Optional

import requests

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
}

BASE = "https://data-api.kbland.kr/bfmstat/weekMnthlyHuseTrnd"

# 시도 코드 → DB region_code 매핑 (10자리 → 4자리)
SIDO_CODE_MAP = {
    "0000000000": "0000",  # 전국
    "1100000000": "1100",  # 서울
    "1A0000":     "1101",  # 강북14개구
    "1B0000":     "1102",  # 강남11개구
    "1T0000":     "KB085", # 수도권
    "2A0000":     "KB030", # 6개광역시
    "2B0000":     "KB084", # 5개광역시
    "4A0000":     "KB186", # 기타지방
    "2600000000": "2600",  # 부산
    "2700000000": "2700",  # 대구
    "2800000000": "2300",  # 인천 (KB는 2800, 기존 DB는 2300)
    "2900000000": "2900",  # 광주
    "3000000000": "3000",  # 대전
    "3100000000": "3100",  # 울산
    "3600000000": "3600",  # 세종
    "4100000000": "4100",  # 경기
    "4300000000": "4300",  # 충북
    "4400000000": "4400",  # 충남
    "4600000000": "4600",  # 전남
    "4700000000": "4700",  # 경북
    "4800000000": "4800",  # 경남
    "5000000000": "5000",  # 제주
    "5100000000": "4200",  # 강원 (KB는 5100, 기존 DB는 4200)
    "5200000000": "4500",  # 전북 (KB는 5200, 기존 DB는 4500)
}

# 시군구 조회 대상 시도 코드 (KB API 지역코드 파라미터)
SIDO_FOR_SIGUNGU = [
    "11",  # 서울
    "26",  # 부산
    "27",  # 대구
    "28",  # 인천
    "29",  # 광주
    "30",  # 대전
    "31",  # 울산
    "41",  # 경기
    "43",  # 충북
    "44",  # 충남
    "46",  # 전남
    "47",  # 경북
    "48",  # 경남
    "50",  # 제주
    "51",  # 강원
    "52",  # 전북
]


def _api_get(endpoint: str, params: dict) -> Optional[dict]:
    """KB API GET 요청 → dataBody.data 반환"""
    url = f"{BASE}/{endpoint}"
    try:
        r = requests.get(url, params=params, headers=HEADERS, verify=False, timeout=20)
        r.raise_for_status()
        body = r.json().get("dataBody", {})
        if str(body.get("resultCode")) != "11000":
            logger.warning(f"KB API error: {body}")
            return None
        return body.get("data")
    except Exception as e:
        logger.error(f"KB API 요청 실패 ({endpoint}): {e}")
        return None


def _parse_date(s: str) -> Optional[date]:
    """yyyymmdd or yyyymm → date"""
    try:
        if len(s) == 8:
            return datetime.strptime(s, "%Y%m%d").date()
        elif len(s) == 6:
            return datetime.strptime(s, "%Y%m").date()
    except ValueError:
        pass
    return None


def _kb_code_to_db_code(kb_code: str) -> str:
    """KB 10자리 지역코드 → DB 4~6자리 코드"""
    if kb_code in SIDO_CODE_MAP:
        return SIDO_CODE_MAP[kb_code]
    # 시군구: 10자리에서 앞 5자리 사용 (예: 1111000000 → KB_11110)
    if len(kb_code) == 10:
        short = kb_code[:5]
        return f"KB{short}"
    return f"KB{kb_code}"


def _fetch_price_index(price_type_code: str, 기간: str = "2") -> list[dict]:
    """
    주간 아파트 매매/전세 가격지수 수집
    price_type_code: '01'=매매, '02'=전세
    """
    price_type = "buy" if price_type_code == "01" else "rent"
    all_rows = []

    # 1) 전국 광역시도 레벨
    data = _api_get("priceIndex", {
        "월간주간구분코드": "02",
        "매물종별구분": "01",
        "매매전세코드": price_type_code,
        "기간": 기간,
    })
    if data:
        all_rows.extend(_parse_index_data(data, price_type))

    # 2) 시군구 레벨 (시도별로 호출)
    for sido in SIDO_FOR_SIGUNGU:
        data = _api_get("priceIndex", {
            "월간주간구분코드": "02",
            "매물종별구분": "01",
            "매매전세코드": price_type_code,
            "지역코드": sido,
            "기간": 기간,
        })
        if data:
            # 시도 광역 데이터 중복 제거 (이미 전국 호출에서 받음)
            rows = _parse_index_data(data, price_type)
            # 시도 자체 코드는 제외 (이미 전국에서 수집)
            sido_10 = sido.ljust(10, '0')
            rows = [r for r in rows if not r["_kb_code"].endswith("0" * 6)]
            all_rows.extend(rows)

    # _kb_code 제거
    for r in all_rows:
        r.pop("_kb_code", None)

    logger.info(f"KB API {price_type}: {len(all_rows)}건 수집")
    return all_rows


def _parse_index_data(data: dict, price_type: str) -> list[dict]:
    """API 응답에서 가격지수 rows 추출"""
    dates = data.get("날짜리스트", [])
    regions = data.get("데이터리스트", [])
    rows = []
    for rg in regions:
        kb_code = rg.get("지역코드", "")
        db_code = _kb_code_to_db_code(kb_code)
        name = rg.get("지역명", "")
        data_list = rg.get("dataList", [])
        for i, date_str in enumerate(dates):
            d = _parse_date(date_str)
            if d is None or i >= len(data_list):
                continue
            val = data_list[i]
            if val is None:
                continue
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
            rows.append({
                "survey_date": d,
                "region_code": db_code,
                "region_name": name,
                "price_type": price_type,
                "index_value": val,
                "weekly_change": None,
                "jeonse_ratio": None,
                "_kb_code": kb_code,
            })
    return rows


def _fetch_change_rate(price_type_code: str, 기간: str = "2") -> dict:
    """
    주간 가격지수증감률 수집 → {(date, db_code): change_rate}
    """
    price_type = "buy" if price_type_code == "01" else "rent"
    change_map = {}

    # 전국
    data = _api_get("prcIndxInxrdcRt", {
        "월간주간구분코드": "02",
        "매물종별구분": "01",
        "매매전세코드": price_type_code,
        "기간": 기간,
    })
    if data:
        _parse_change_data(data, change_map)

    # 시군구
    for sido in SIDO_FOR_SIGUNGU:
        data = _api_get("prcIndxInxrdcRt", {
            "월간주간구분코드": "02",
            "매물종별구분": "01",
            "매매전세코드": price_type_code,
            "지역코드": sido,
            "기간": 기간,
        })
        if data:
            _parse_change_data(data, change_map)

    logger.info(f"KB API 변동률 {price_type}: {len(change_map)}건")
    return change_map


def _parse_change_data(data: dict, change_map: dict):
    """변동률 응답 파싱 → change_map에 추가"""
    dates = data.get("날짜리스트", [])
    regions = data.get("데이터리스트", [])
    for rg in regions:
        kb_code = rg.get("지역코드", "")
        db_code = _kb_code_to_db_code(kb_code)
        data_list = rg.get("dataList", [])
        for i, date_str in enumerate(dates):
            d = _parse_date(date_str)
            if d is None or i >= len(data_list):
                continue
            val = data_list[i]
            if val is None:
                continue
            try:
                change_map[(d, db_code)] = float(val)
            except (TypeError, ValueError):
                pass


def _fetch_market_trend(menu_code: str, 기간: str = "2") -> list[dict]:
    """
    시장동향 수집
    menu_code: '01'=매수우위지수, '03'=전세수급지수
    """
    col_map = {
        "01": "매수우위지수",
        "03": "전세수급지수",
    }
    col_name = col_map.get(menu_code, "값")

    data = _api_get("maktTrnd", {
        "메뉴코드": menu_code,
        "월간주간구분코드": "02",
        "기간": 기간,
    })
    if not data:
        return []

    dates = data.get("날짜리스트", [])
    regions = data.get("데이터리스트", [])
    rows = []
    for rg in regions:
        kb_code = rg.get("지역코드", "")
        db_code = _kb_code_to_db_code(kb_code)
        name = rg.get("지역명", "")
        data_list = rg.get("dataList", [])
        for i, date_str in enumerate(dates):
            d = _parse_date(date_str)
            if d is None or i >= len(data_list):
                continue
            val = data_list[i]
            if val is None:
                continue
            # dataList 항목은 dict(여러 값) or 단일 값
            if isinstance(val, dict):
                index_val = val.get(col_name)
            else:
                index_val = val
            if index_val is None:
                continue
            try:
                index_val = float(index_val)
            except (TypeError, ValueError):
                continue
            rows.append({
                "survey_date": d,
                "region_code": db_code,
                "region_name": name,
                "menu": menu_code,
                "value": index_val,
            })

    logger.info(f"KB API 시장동향 {col_name}: {len(rows)}건")
    return rows


async def run_all(기간: str = "2") -> dict:
    """
    KB 데이터 전체 수집 (API 기반)
    Returns: {"price": [...], "sentiment": [...]}
    """
    loop = asyncio.get_event_loop()

    # 동기 HTTP 호출을 ThreadPool에서 실행
    logger.info("KB API 수집 시작")

    # 1. 매매 가격지수 + 변동률
    buy_rows = await loop.run_in_executor(None, _fetch_price_index, "01", 기간)
    buy_changes = await loop.run_in_executor(None, _fetch_change_rate, "01", 기간)

    # 2. 전세 가격지수 + 변동률
    rent_rows = await loop.run_in_executor(None, _fetch_price_index, "02", 기간)
    rent_changes = await loop.run_in_executor(None, _fetch_change_rate, "02", 기간)

    # 3. 변동률 매핑
    for row in buy_rows:
        key = (row["survey_date"], row["region_code"])
        row["weekly_change"] = buy_changes.get(key)

    for row in rent_rows:
        key = (row["survey_date"], row["region_code"])
        row["weekly_change"] = rent_changes.get(key)

    # 4. 전세가율 계산
    rent_lookup = {
        (r["survey_date"], r["region_code"]): r["index_value"]
        for r in rent_rows
    }
    for row in buy_rows:
        rent_val = rent_lookup.get((row["survey_date"], row["region_code"]))
        if rent_val and row["index_value"] and row["index_value"] > 0:
            row["jeonse_ratio"] = rent_val / row["index_value"]

    # 5. 심리지수 (매수우위지수 + 전세수급지수)
    buyer_rows = await loop.run_in_executor(None, _fetch_market_trend, "01", 기간)
    supply_rows = await loop.run_in_executor(None, _fetch_market_trend, "03", 기간)

    # 심리지수 합치기
    sentiment_map: dict[tuple, dict] = {}
    for r in buyer_rows:
        key = (r["survey_date"], r["region_code"])
        if key not in sentiment_map:
            sentiment_map[key] = {
                "region_name": r["region_name"],
                "buyer_seller": None,
                "jeonse_supply": None,
            }
        sentiment_map[key]["buyer_seller"] = r["value"]

    for r in supply_rows:
        key = (r["survey_date"], r["region_code"])
        if key not in sentiment_map:
            sentiment_map[key] = {
                "region_name": r["region_name"],
                "buyer_seller": None,
                "jeonse_supply": None,
            }
        sentiment_map[key]["jeonse_supply"] = r["value"]

    sentiment = [
        {
            "survey_date": d,
            "region_code": code,
            "region_name": v["region_name"],
            "buyer_seller_index": v["buyer_seller"],
            "jeonse_supply_index": v["jeonse_supply"],
        }
        for (d, code), v in sentiment_map.items()
    ]

    logger.info(f"KB API 수집 완료: 가격={len(buy_rows) + len(rent_rows)}건, 심리={len(sentiment)}건")

    return {
        "price": buy_rows + rent_rows,
        "sentiment": sentiment,
    }
