"""
가격지수 관련 DB 모델
- 한국부동산원: 주간 매매/전세 가격지수, 수급동향
- KB 리브온: 주간 매매/전세 가격지수, 심리지수, 전세수급
"""
from sqlalchemy import Column, String, Float, Date, DateTime, Integer, Index
from sqlalchemy.sql import func
from app.database import Base


class RebPriceIndex(Base):
    """한국부동산원 주간 매매/전세 가격지수"""
    __tablename__ = "reb_price_index"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_date = Column(Date, nullable=False, index=True)   # 조사기준일
    region_code = Column(String(20), nullable=False, index=True)
    region_name = Column(String(50), nullable=False)
    price_type = Column(String(10), nullable=False)          # 'buy' | 'rent'
    index_value = Column(Float)                              # 가격지수
    weekly_change = Column(Float)                            # 주간 변동률(%)
    monthly_change = Column(Float)                           # 월간 변동률(%)
    yoy_change = Column(Float)                               # 전년비 변동률(%)
    source = Column(String(10), default="REB")
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_reb_price_date_region_type",
              "survey_date", "region_code", "price_type", unique=True),
    )


class RebSupplyDemand(Base):
    """한국부동산원 매매/전세 수급동향"""
    __tablename__ = "reb_supply_demand"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_date = Column(Date, nullable=False, index=True)
    region_code = Column(String(20), nullable=False)
    region_name = Column(String(50), nullable=False)
    price_type = Column(String(10), nullable=False)          # 'buy' | 'rent'
    supply_demand_index = Column(Float)                      # 수급지수 (100 기준)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_reb_sd_date_region_type",
              "survey_date", "region_code", "price_type", unique=True),
    )


class KbPriceIndex(Base):
    """KB 리브온 주간 매매/전세 가격지수"""
    __tablename__ = "kb_price_index"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_date = Column(Date, nullable=False, index=True)
    region_code = Column(String(20), nullable=False, index=True)
    region_name = Column(String(50), nullable=False)
    price_type = Column(String(10), nullable=False)          # 'buy' | 'rent'
    index_value = Column(Float)
    weekly_change = Column(Float)
    jeonse_ratio = Column(Float)                             # 전세가율(%)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_kb_price_date_region_type",
              "survey_date", "region_code", "price_type", unique=True),
    )


class KbSentiment(Base):
    """KB 매수매도심리 / 전세수급지수"""
    __tablename__ = "kb_sentiment"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_date = Column(Date, nullable=False, index=True)
    region_code = Column(String(20), nullable=False)
    region_name = Column(String(50), nullable=False)
    buyer_seller_index = Column(Float)    # 매수우위지수 (100 초과=매수우위)
    jeonse_supply_index = Column(Float)   # 전세수급지수
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_kb_sentiment_date_region",
              "survey_date", "region_code", unique=True),
    )
