"""
데이터 저장 서비스 — 수집기 결과를 DB에 저장하고 파생지표 재계산
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date as _date
import logging


def _to_date(v) -> _date:
    """문자열 날짜를 Python date 객체로 변환 (SQLite 호환)"""
    if isinstance(v, _date):
        return v
    if isinstance(v, str):
        s = v[:10]  # 'YYYY-MM-DD' or 'YYYYMMDD'
        if len(v) == 8 and v.isdigit():
            return _date(int(v[:4]), int(v[4:6]), int(v[6:8]))
        return _date.fromisoformat(s)
    return v


def _fix_dates(row: dict, *fields) -> dict:
    """지정된 필드들을 date 객체로 변환한 새 dict 반환"""
    row = row.copy()
    for f in fields:
        if f in row and row[f] is not None:
            row[f] = _to_date(row[f])
    return row

from app.models.price_index import RebPriceIndex, KbPriceIndex, KbSentiment
from app.models.economy import EconomyIndex
from app.models.supply import HousingSupply
from app.models.calculated import LivingIndex
from app.calculators.living_index import calculate as calc_living

logger = logging.getLogger(__name__)


async def upsert_reb_price(db: AsyncSession, rows: list[dict]) -> int:
    saved = 0
    for row in rows:
        row = _fix_dates(row, 'survey_date')
        stmt = select(RebPriceIndex).where(and_(
            RebPriceIndex.survey_date == row['survey_date'],
            RebPriceIndex.region_code == row['region_code'],
            RebPriceIndex.price_type == row['price_type'],
        ))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            for k, v in row.items():
                setattr(existing, k, v)
        else:
            db.add(RebPriceIndex(**row))
            saved += 1
    await db.commit()
    logger.info(f"REB 가격지수 {saved}건 신규 (총 {len(rows)}건)")
    return saved


async def upsert_economy(db: AsyncSession, rows: list[dict]) -> int:
    saved = 0
    for row in rows:
        row = _fix_dates(row, 'ref_date')
        stmt = select(EconomyIndex).where(and_(
            EconomyIndex.ref_date == row['ref_date'],
            EconomyIndex.indicator == row['indicator'],
        ))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.value = row['value']
        else:
            db.add(EconomyIndex(**row))
            saved += 1
    await db.commit()
    logger.info(f"경제지표 {saved}건 신규 (총 {len(rows)}건)")
    return saved


async def upsert_supply(db: AsyncSession, rows: list[dict]) -> int:
    saved = 0
    for row in rows:
        row = _fix_dates(row, 'ref_date')
        stmt = select(HousingSupply).where(and_(
            HousingSupply.ref_date == row['ref_date'],
            HousingSupply.region_code == row['region_code'],
            HousingSupply.data_type == row['data_type'],
        ))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.value = row['value']
        else:
            db.add(HousingSupply(**row))
            saved += 1
    await db.commit()
    logger.info(f"공급/거래 {saved}건 신규 (총 {len(rows)}건)")
    return saved


async def upsert_kb_price(db: AsyncSession, rows: list[dict]) -> int:
    saved = 0
    for row in rows:
        row = _fix_dates(row, 'survey_date')
        stmt = select(KbPriceIndex).where(and_(
            KbPriceIndex.survey_date == row['survey_date'],
            KbPriceIndex.region_code == row['region_code'],
            KbPriceIndex.price_type == row['price_type'],
        ))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.index_value = row.get('index_value')
            existing.weekly_change = row.get('weekly_change')
        else:
            db.add(KbPriceIndex(**row))
            saved += 1
    await db.commit()
    logger.info(f"KB 가격지수 {saved}건 신규 (총 {len(rows)}건)")
    return saved


async def upsert_kb_sentiment(db: AsyncSession, rows: list[dict]) -> int:
    saved = 0
    for row in rows:
        row = _fix_dates(row, 'survey_date')
        stmt = select(KbSentiment).where(and_(
            KbSentiment.survey_date == row['survey_date'],
            KbSentiment.region_code == row['region_code'],
        ))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.buyer_seller_index = row.get('buyer_seller_index')
            existing.jeonse_supply_index = row.get('jeonse_supply_index')
        else:
            db.add(KbSentiment(**row))
            saved += 1
    await db.commit()
    logger.info(f"KB 심리/수급 {saved}건 신규 (총 {len(rows)}건)")
    return saved


async def recalculate_living_index(db: AsyncSession) -> int:
    """실거주지수 전 지역 최신값 재계산"""
    buy_rows = (await db.execute(
        select(RebPriceIndex)
        .where(RebPriceIndex.price_type == 'buy')
        .order_by(RebPriceIndex.survey_date.desc())
        .limit(300)
    )).scalars().all()

    rent_rows = (await db.execute(
        select(RebPriceIndex)
        .where(RebPriceIndex.price_type == 'rent')
        .order_by(RebPriceIndex.survey_date.desc())
        .limit(300)
    )).scalars().all()

    rate_row = (await db.execute(
        select(EconomyIndex)
        .where(EconomyIndex.indicator == 'mortgage_rate')
        .order_by(EconomyIndex.ref_date.desc())
        .limit(1)
    )).scalar_one_or_none()

    conv_row = (await db.execute(
        select(EconomyIndex)
        .where(EconomyIndex.indicator == 'conversion_rate')
        .order_by(EconomyIndex.ref_date.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not rate_row:
        logger.warning("주담대금리 없음 — 실거주지수 계산 스킵")
        return 0

    mortgage_rate = float(rate_row.value)
    conversion_rate = float(conv_row.value) if conv_row else 5.5

    # 지역별 최신값 매핑
    buy_map: dict[str, tuple] = {}
    for r in buy_rows:
        if r.region_code not in buy_map:
            buy_map[r.region_code] = (r.survey_date, float(r.index_value), r.region_name or '')

    rent_map: dict[str, float] = {}
    for r in rent_rows:
        if r.region_code not in rent_map:
            rent_map[r.region_code] = float(r.index_value)

    saved = 0
    for region_code, (b_date, buy_idx, region_name) in buy_map.items():
        if region_code not in rent_map:
            continue
        rent_idx = rent_map[region_code]
        jeonse_ratio = rent_idx / buy_idx if buy_idx > 0 else 0.6

        result = calc_living({
            'buy_index': buy_idx, 'rent_index': rent_idx,
            'jeonse_ratio': jeonse_ratio,
            'conversion_rate': conversion_rate,
            'mortgage_rate': mortgage_rate,
        })

        stmt = select(LivingIndex).where(and_(
            LivingIndex.ref_date == b_date,
            LivingIndex.region_code == region_code,
        ))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.living_index = result['living_index']
            existing.monthly_saving = result['monthly_saving']
            existing.mortgage_rate = mortgage_rate
        else:
            db.add(LivingIndex(
                ref_date=b_date, region_code=region_code, region_name=region_name,
                buy_index=buy_idx, rent_index=rent_idx, jeonse_ratio=jeonse_ratio,
                conversion_rate=conversion_rate, mortgage_rate=mortgage_rate,
                living_index=result['living_index'], monthly_saving=result['monthly_saving'],
            ))
            saved += 1

    await db.commit()
    logger.info(f"실거주지수 {saved}건 계산 저장")
    return saved
