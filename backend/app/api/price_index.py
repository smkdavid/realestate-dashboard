from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, distinct, desc, asc, func as sa_func
from app.database import get_db
from app.models import RebPriceIndex, KbPriceIndex, KbSentiment
from datetime import date, timedelta
from typing import Optional, List
from collections import defaultdict

router = APIRouter(prefix="/price-index", tags=["가격지수"])


@router.get("/kb/regions")
async def get_kb_regions(db: AsyncSession = Depends(get_db)):
    """KB 가격지수 DB에 실제 존재하는 지역 목록 반환 (region_code, region_name)"""
    result = await db.execute(
        select(KbPriceIndex.region_code, KbPriceIndex.region_name)
        .distinct()
        .order_by(KbPriceIndex.region_code)
    )
    rows = result.all()
    return [{"code": r.region_code, "name": r.region_name} for r in rows]


@router.get("/kb/sentiment/regions")
async def get_kb_sentiment_regions(db: AsyncSession = Depends(get_db)):
    """KB 심리지수 DB에 실제 존재하는 지역 목록 반환"""
    result = await db.execute(
        select(KbSentiment.region_code, KbSentiment.region_name)
        .distinct()
        .order_by(KbSentiment.region_code)
    )
    rows = result.all()
    return [{"code": r.region_code, "name": r.region_name} for r in rows]


@router.get("/kb/available-dates")
async def get_kb_available_dates(
    price_type: str = Query("buy"),
    db: AsyncSession = Depends(get_db),
):
    """DB에 존재하는 KB survey_date 목록 (날짜 선택기용)"""
    result = await db.execute(
        select(distinct(KbPriceIndex.survey_date))
        .where(KbPriceIndex.price_type == price_type)
        .order_by(desc(KbPriceIndex.survey_date))
    )
    return [str(r[0]) for r in result.all()]


@router.get("/kb/top-movers")
async def get_kb_top_movers(
    price_type: str = Query("buy"),
    survey_date: Optional[date] = Query(None),
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
):
    """주간 변동률 상위/하위 N개 지역 반환"""
    # survey_date가 없으면 최신 날짜 사용
    if not survey_date:
        latest = await db.execute(
            select(sa_func.max(KbPriceIndex.survey_date))
            .where(KbPriceIndex.price_type == price_type)
        )
        survey_date = latest.scalar()
        if not survey_date:
            return {"survey_date": None, "rising": [], "falling": []}

    base = (
        select(KbPriceIndex.region_code, KbPriceIndex.region_name,
               KbPriceIndex.weekly_change, KbPriceIndex.index_value)
        .where(and_(
            KbPriceIndex.price_type == price_type,
            KbPriceIndex.survey_date == survey_date,
            KbPriceIndex.weekly_change.isnot(None),
        ))
    )

    rising_q = base.order_by(desc(KbPriceIndex.weekly_change)).limit(limit)
    falling_q = base.order_by(asc(KbPriceIndex.weekly_change)).limit(limit)

    rising_res = await db.execute(rising_q)
    falling_res = await db.execute(falling_q)

    def to_list(rows):
        return [{"region_code": r.region_code, "region_name": r.region_name,
                 "weekly_change": r.weekly_change, "index_value": r.index_value} for r in rows]

    return {
        "survey_date": str(survey_date),
        "rising": to_list(rising_res.all()),
        "falling": to_list(falling_res.all()),
    }


@router.get("/kb/snapshot")
async def get_kb_snapshot(
    price_type: str = Query("buy"),
    survey_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """특정 날짜의 모든 지역 weekly_change + index_value (지도용)"""
    if not survey_date:
        latest = await db.execute(
            select(sa_func.max(KbPriceIndex.survey_date))
            .where(KbPriceIndex.price_type == price_type)
        )
        survey_date = latest.scalar()
        if not survey_date:
            return {"survey_date": None, "data": []}

    result = await db.execute(
        select(KbPriceIndex.region_code, KbPriceIndex.region_name,
               KbPriceIndex.weekly_change, KbPriceIndex.index_value)
        .where(and_(
            KbPriceIndex.price_type == price_type,
            KbPriceIndex.survey_date == survey_date,
        ))
        .order_by(KbPriceIndex.region_code)
    )
    rows = result.all()
    return {
        "survey_date": str(survey_date),
        "data": [{"region_code": r.region_code, "region_name": r.region_name,
                   "weekly_change": r.weekly_change, "index_value": r.index_value} for r in rows],
    }


@router.get("/kb/heatmap")
async def get_kb_heatmap(
    price_type: str = Query("buy"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """날짜별 전체 지역의 weekly_change 피벗 (히트맵용)"""
    since = start_date or (date.today() - timedelta(days=365))
    until = end_date or date.today()

    result = await db.execute(
        select(KbPriceIndex.survey_date, KbPriceIndex.region_code,
               KbPriceIndex.region_name, KbPriceIndex.weekly_change)
        .where(and_(
            KbPriceIndex.price_type == price_type,
            KbPriceIndex.survey_date >= since,
            KbPriceIndex.survey_date <= until,
        ))
        .order_by(KbPriceIndex.survey_date, KbPriceIndex.region_code)
    )
    rows = result.all()

    dates_set: set = set()
    region_names: dict = {}
    pivot: dict = defaultdict(dict)

    for r in rows:
        d = str(r.survey_date)
        dates_set.add(d)
        region_names[r.region_code] = r.region_name
        pivot[d][r.region_code] = r.weekly_change

    dates = sorted(dates_set, reverse=True)
    region_codes = sorted(region_names.keys())

    return {
        "dates": dates,
        "region_codes": region_codes,
        "region_names": region_names,
        "data": [{"date": d, "values": pivot[d]} for d in dates],
    }


@router.get("/kb/charging-index")
async def get_kb_charging_index(
    region_codes: str = Query("11000,41000,30000,29000,26000"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """충전지수 = rent_index - buy_index per region per date"""
    codes = [c.strip() for c in region_codes.split(",") if c.strip()]
    since = start_date or (date.today() - timedelta(days=2000))
    until = end_date or date.today()

    result = await db.execute(
        select(KbPriceIndex.survey_date, KbPriceIndex.region_code,
               KbPriceIndex.region_name, KbPriceIndex.price_type,
               KbPriceIndex.index_value)
        .where(and_(
            KbPriceIndex.region_code.in_(codes),
            KbPriceIndex.survey_date >= since,
            KbPriceIndex.survey_date <= until,
        ))
        .order_by(KbPriceIndex.survey_date)
    )
    rows = result.all()

    # group by region_code → date → {buy, rent}
    grouped: dict = defaultdict(lambda: defaultdict(dict))
    names: dict = {}
    for r in rows:
        names[r.region_code] = r.region_name
        grouped[r.region_code][str(r.survey_date)][r.price_type] = r.index_value

    out = []
    for code in codes:
        if code not in grouped:
            continue
        data = []
        for d in sorted(grouped[code].keys()):
            vals = grouped[code][d]
            buy = vals.get("buy")
            rent = vals.get("rent")
            charging = round(rent - buy, 4) if buy is not None and rent is not None else None
            data.append({"date": d, "charging_index": charging,
                         "buy_index": buy, "rent_index": rent})
        out.append({"region_code": code, "region_name": names.get(code, code), "data": data})

    return out


@router.get("/reb")
async def get_reb_index(
    region_code: str = Query("0000"),
    price_type:  str = Query("buy"),
    days:        int = Query(365),
    start_date: Optional[date] = Query(None),
    end_date:   Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    since = start_date or (date.today() - timedelta(days=days))
    until = end_date or date.today()
    result = await db.execute(
        select(RebPriceIndex)
        .where(and_(
            RebPriceIndex.region_code == region_code,
            RebPriceIndex.price_type  == price_type,
            RebPriceIndex.survey_date >= since,
            RebPriceIndex.survey_date <= until,
        ))
        .order_by(RebPriceIndex.survey_date)
    )
    rows = result.scalars().all()
    return [{"date": r.survey_date, "value": r.index_value,
             "change": r.weekly_change, "region": r.region_name} for r in rows]


@router.get("/kb")
async def get_kb_index(
    region_code: str = Query("0000"),
    price_type:  str = Query("buy"),
    days:        int = Query(2000),
    start_date: Optional[date] = Query(None),
    end_date:   Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    since = start_date or (date.today() - timedelta(days=days))
    until = end_date or date.today()
    result = await db.execute(
        select(KbPriceIndex)
        .where(and_(
            KbPriceIndex.region_code == region_code,
            KbPriceIndex.price_type  == price_type,
            KbPriceIndex.survey_date >= since,
            KbPriceIndex.survey_date <= until,
        ))
        .order_by(KbPriceIndex.survey_date)
    )
    rows = result.scalars().all()
    return [{"date": r.survey_date, "value": r.index_value,
             "change": r.weekly_change, "jeonse_ratio": r.jeonse_ratio} for r in rows]


@router.get("/sentiment")
async def get_sentiment(
    region_code: str = Query("0000"),
    days:        int = Query(2000),
    start_date: Optional[date] = Query(None),
    end_date:   Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    since = start_date or (date.today() - timedelta(days=days))
    until = end_date or date.today()
    result = await db.execute(
        select(KbSentiment)
        .where(and_(
            KbSentiment.region_code == region_code,
            KbSentiment.survey_date >= since,
            KbSentiment.survey_date <= until,
        ))
        .order_by(KbSentiment.survey_date)
    )
    rows = result.scalars().all()
    return [{"date": r.survey_date, "buyer_seller": r.buyer_seller_index,
             "jeonse_supply": r.jeonse_supply_index} for r in rows]
