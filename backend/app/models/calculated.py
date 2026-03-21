from sqlalchemy import Column, String, Float, Date, DateTime, Integer, Index
from sqlalchemy.sql import func
from app.database import Base


class LivingIndex(Base):
    """실거주지수 — 매수 vs 전세 비용 비교 (자체 계산)
    100 이하 = 매수 유리 / 100 초과 = 전세 유리
    """
    __tablename__ = "living_index"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ref_date = Column(Date, nullable=False, index=True)
    region_code = Column(String(20), nullable=False, index=True)
    region_name = Column(String(50))

    buy_index = Column(Float)         # 매매가격지수
    rent_index = Column(Float)        # 전세가격지수
    jeonse_ratio = Column(Float)      # 전세가율 (%)
    conversion_rate = Column(Float)   # 전월세전환율 (%)
    mortgage_rate = Column(Float)     # 주담대금리 (%)
    living_index = Column(Float)      # 최종 실거주지수
    monthly_saving = Column(Float)    # 매수 시 월 절감액 (만원)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_living_date_region", "ref_date", "region_code", unique=True),
    )


class BubbleIndex(Base):
    """버블지수 — 금리 + KB가격지수 복합 (자체 계산)"""
    __tablename__ = "bubble_index"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ref_date = Column(Date, nullable=False, index=True)
    region_code = Column(String(20), nullable=False, index=True)
    region_name = Column(String(50))

    kb_buy_index = Column(Float)      # KB 매매지수
    interest_rate = Column(Float)     # 금리 (회사채 AA-)
    rate_converted = Column(Float)    # 금리 환산 지수
    bubble_index = Column(Float)      # 버블지수
    undervalue_ratio = Column(Float)  # 저평가 비율 (현재/평균)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_bubble_date_region", "ref_date", "region_code", unique=True),
    )
