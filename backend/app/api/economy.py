from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models import EconomyIndex
from datetime import date, timedelta
from typing import Optional
import calendar

router = APIRouter(prefix="/economy", tags=["경제지표"])


@router.get("")
async def get_economy(
    indicator: str = Query("mortgage_rate"),
    days:      int = Query(365 * 5),
    start_date: Optional[date] = Query(None),
    end_date:   Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # 월간 데이터: start_date는 해당 월 1일로 내림, end_date는 해당 월 말일로 올림
    if start_date:
        since = start_date.replace(day=1)
    else:
        since = date.today() - timedelta(days=days)

    if end_date:
        last_day = calendar.monthrange(end_date.year, end_date.month)[1]
        until = end_date.replace(day=last_day)
    else:
        until = date.today()

    result = await db.execute(
        select(EconomyIndex)
        .where(and_(
            EconomyIndex.indicator == indicator,
            EconomyIndex.ref_date  >= since,
            EconomyIndex.ref_date  <= until,
        ))
        .order_by(EconomyIndex.ref_date)
    )
    rows = result.scalars().all()
    return [{"date": r.ref_date, "value": r.value, "unit": r.unit} for r in rows]


@router.get("/latest")
async def get_latest_economy(db: AsyncSession = Depends(get_db)):
    """모든 경제지표 최신값 한번에"""
    from sqlalchemy import func
    subq = select(
        EconomyIndex.indicator,
        func.max(EconomyIndex.ref_date).label("max_date"),
    ).group_by(EconomyIndex.indicator).subquery()

    result = await db.execute(
        select(EconomyIndex).join(
            subq,
            and_(EconomyIndex.indicator == subq.c.indicator,
                 EconomyIndex.ref_date  == subq.c.max_date),
        )
    )
    rows = result.scalars().all()
    return {r.indicator: {"value": r.value, "unit": r.unit, "date": r.ref_date}
            for r in rows}
