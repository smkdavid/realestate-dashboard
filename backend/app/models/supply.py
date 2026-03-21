from sqlalchemy import Column, String, Float, Date, DateTime, Integer, Index
from sqlalchemy.sql import func
from app.database import Base


class HousingSupply(Base):
    """국토교통부 인허가/입주/미분양/거래량"""
    __tablename__ = "housing_supply"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ref_date = Column(Date, nullable=False, index=True)
    region_code = Column(String(20), nullable=False, index=True)
    region_name = Column(String(50))
    data_type = Column(String(30), nullable=False, index=True)
    # data_type 종류:
    # 'permit'        인허가 (호)
    # 'unsold'        미분양 (호)
    # 'trade_volume'  거래량 (건)
    # 'outsider_trade' 외지인거래 (건)
    value = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_supply_date_region_type",
              "ref_date", "region_code", "data_type", unique=True),
    )


class ScheduledMoveIn(Base):
    """국토교통부 입주예정 단지"""
    __tablename__ = "scheduled_movein"

    id = Column(Integer, primary_key=True, autoincrement=True)
    movein_date = Column(Date, nullable=False, index=True)   # 입주 예정 월
    region_code = Column(String(20), index=True)
    region_name = Column(String(50))
    complex_name = Column(String(100))
    total_units = Column(Integer)
    housing_type = Column(String(20))                        # 아파트/오피스텔 등
    created_at = Column(DateTime, server_default=func.now())
