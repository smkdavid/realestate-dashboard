from sqlalchemy import Column, String, Float, Date, DateTime, Integer, Index
from sqlalchemy.sql import func
from app.database import Base


class EconomyIndex(Base):
    """한국은행 경제지표 통합 테이블
    indicator 종류: base_rate, mortgage_rate, deposit_rate,
                   m1, m2, cpi, gdp_growth, household_delinquency, fx_reserve
    """
    __tablename__ = "economy_index"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ref_date = Column(Date, nullable=False, index=True)
    indicator = Column(String(50), nullable=False, index=True)
    value = Column(Float)
    unit = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_economy_date_indicator", "ref_date", "indicator", unique=True),
    )
