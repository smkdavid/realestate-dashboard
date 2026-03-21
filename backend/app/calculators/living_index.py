"""
실거주지수 계산기 (핵심)
100 이하 = 매수유리 / 100 초과 = 전세유리

공식:
  전세월비용 = 매매가 × 전세가율 × (전환율/100) / 12
  매수월비용 = 매매가 × (1-전세가율) × (주담대금리/100) / 12
  실거주지수 = (전세월비용 / 매수월비용) × 100
"""
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class LivingIndexInput:
    region_code: str
    region_name: str
    ref_date: str
    buy_index: float        # 매매가격지수
    rent_index: float       # 전세가격지수
    jeonse_ratio: float     # 전세가율 (0~1)
    conversion_rate: float  # 전월세전환율 (%)
    mortgage_rate: float    # 주담대금리 (%)

def calculate(inp: LivingIndexInput) -> dict:
    try:
        rent_cost = inp.buy_index * inp.jeonse_ratio * (inp.conversion_rate/100) / 12
        buy_cost  = inp.buy_index * (1 - inp.jeonse_ratio) * (inp.mortgage_rate/100) / 12
        if buy_cost == 0:
            return {}
        return {
            "ref_date":        inp.ref_date,
            "region_code":     inp.region_code,
            "region_name":     inp.region_name,
            "buy_index":       inp.buy_index,
            "rent_index":      inp.rent_index,
            "jeonse_ratio":    inp.jeonse_ratio,
            "conversion_rate": inp.conversion_rate,
            "mortgage_rate":   inp.mortgage_rate,
            "living_index":    round((rent_cost / buy_cost) * 100, 2),
            "monthly_saving":  round(rent_cost - buy_cost, 4),
        }
    except Exception as e:
        logger.error(f"실거주지수 계산 오류 {inp.region_name}: {e}")
        return {}

def calculate_batch(inputs: list) -> list:
    return [r for inp in inputs if (r := calculate(inp))]
