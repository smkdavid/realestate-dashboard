"""
버블지수 계산기
= KB매매지수 / 금리환산지수
금리환산지수: 기준금리가 낮을수록 지수 상승 → 가격 과대평가 가능성
"""
import logging

logger = logging.getLogger(__name__)

def calculate(region_code, region_name, ref_date,
              kb_buy_index, interest_rate) -> dict:
    try:
        if interest_rate <= 0 or kb_buy_index <= 0:
            return {}
        rate_idx = 1 / (interest_rate / 100)          # 금리 역수 환산
        bubble   = round((kb_buy_index / rate_idx), 4)
        return {
            "ref_date":       ref_date,
            "region_code":    region_code,
            "region_name":    region_name,
            "kb_buy_index":   kb_buy_index,
            "interest_rate":  interest_rate,
            "rate_converted": round(rate_idx, 4),
            "bubble_index":   bubble,
        }
    except Exception as e:
        logger.error(f"버블지수 오류 {region_name}: {e}")
        return {}
