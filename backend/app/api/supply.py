from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models.supply import HousingSupply
from typing import Optional

router = APIRouter(prefix='/supply', tags=['supply'])

@router.get('')
async def get_supply(
    region_code: Optional[str] = Query(None),
    data_type: Optional[str] = Query(None),
    limit: int = Query(24, le=120),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(HousingSupply).order_by(HousingSupply.ref_date.desc()).limit(limit)
    filters = []
    if region_code:
        filters.append(HousingSupply.region_code == region_code)
    if data_type:
        filters.append(HousingSupply.data_type == data_type)
    if filters:
        stmt = stmt.where(and_(*filters))
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return sorted([{
        'id': r.id,
        'year_month': str(r.ref_date)[:7] if r.ref_date else None,
        'date': r.ref_date,
        'region_code': r.region_code,
        'data_type': r.data_type, 'value': r.value,
    } for r in rows], key=lambda x: x['year_month'] or '')
