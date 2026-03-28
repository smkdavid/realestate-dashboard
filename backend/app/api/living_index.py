from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models import LivingIndex
from datetime import date, timedelta

router = APIRouter(prefix="/living-index", tags=["실거주지수"])

@router.get("")
async def get_living_index(
    region_code: str = Query("1100"),
    days:        int = Query(365 * 5),
    db: AsyncSession = Depends(get_db),
):
    """
    실거주지수 조회
    - 100 이하: 매수 유리
    - 100 초과: 전세 유리
    """
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(LivingIndex)
        .where(and_(
            LivingIndex.region_code == region_code,
            LivingIndex.ref_date    >= since,
        ))
        .order_by(LivingIndex.ref_date)
    )
    rows = result.scalars().all()
    return [
        {
            "date":            r.ref_date,
            "region":          r.region_name,
            "living_index":    r.living_index,
            "buy_index":       r.buy_index,
            "rent_index":      r.rent_index,
            "jeonse_ratio":    r.jeonse_ratio,
            "conversion_rate": r.conversion_rate,
            "mortgage_rate":   r.mortgage_rate,
            "monthly_saving":  r.monthly_saving,
        }
        for r in rows
    ]

@router.get("/latest")
async def get_latest_living_index(db: AsyncSession = Depends(get_db)):
    """모든 지역 최신 실거주지수"""
    from sqlalchemy import func
    subq = select(
        LivingIndex.region_code,
        func.max(LivingIndex.ref_date).label("max_date"),
    ).group_by(LivingIndex.region_code).subquery()

    result = await db.execute(
        select(LivingIndex).join(
            subq,
            and_(LivingIndex.region_code == subq.c.region_code,
                 LivingIndex.ref_date    == subq.c.max_date),
        )
    )
    rows = result.scalars().all()
    return [{"region_code": r.region_code, "region": r.region_name,
             "living_index": r.living_index, "date": r.ref_date} for r in rows]
