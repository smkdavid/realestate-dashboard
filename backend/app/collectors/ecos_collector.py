"""
한국은행 ECOS API 수집기  |  키 발급: https://ecos.bok.or.kr/api/
"""
import httpx, logging
from datetime import date
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
BASE_URL = "https://ecos.bok.or.kr/api/StatisticSearch"

INDICATORS = [
    # stat_code  freq  item1         item2  indicator_name          unit
    ("722Y001","M","0101000",     "",      "base_rate",            "%"),       # 한국은행 기준금리
    ("121Y006","M","BECBLA0302",  "",      "mortgage_rate",        "%"),       # 예금은행 주택담보대출금리(신규)
    ("121Y002","M","BEABAA2118",  "",      "deposit_rate",         "%"),       # 예금은행 정기예금 1년(신규)
    ("161Y002","M","BBLA00",      "",      "m1",                   "십억원"),  # M1 협의통화(평잔, 원계열)
    ("161Y006","M","BBHA00",      "",      "m2",                   "십억원"),  # M2 광의통화(평잔, 원계열)
    ("901Y009","M","0",           "",      "cpi",                  "지수"),    # 소비자물가지수 총지수
    ("721Y001","M","5020000",     "",      "bond_3y",              "%"),       # 국고채 3년
    ("721Y001","M","5030000",     "",      "corp_bond_3y",         "%"),       # 회사채 3년(AA-)
    ("901Y054","M","MO3AB",       "",      "household_delinquency","%"),       # 가계대출 연체율(1일이상)
    ("151Y002","M","1110000",     "",      "household_loan",       "십억원"),  # 예금취급기관 가계대출(전체)
    ("200Y004","Q","10101",       "",      "gdp_growth",           "%"),       # 실질GDP 성장률(전기대비, 계절조정)
    ("902Y010","Q","KR",          "",      "fx_reserves",          "백만달러"), # 외환보유액(한국, 분기)
]

def _period(freq):
    t = date.today()
    if freq == "Q":
        return f"{t.year-3}Q1", f"{t.year}Q4"
    return f"{t.year-3}{t.month:02d}", f"{t.year}{t.month:02d}"

async def fetch_indicator(stat_code, freq, item1, item2, name, unit):
    start, end = _period(freq)
    suffix = f"/{item1}" if item1 else ""
    if item2:
        suffix += f"/{item2}"
    url = f"{BASE_URL}/{settings.ECOS_API_KEY}/json/kr/1/1000/{stat_code}/{freq}/{start}/{end}{suffix}"
    results = []
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            rows = (await c.get(url)).json().get("StatisticSearch",{}).get("row",[])
        for r in rows:
            t = r.get("TIME","")
            if "Q" in t:
                y,q = t.split("Q"); m=(int(q)-1)*3+1; d=f"{y}-{m:02d}-01"
            else:
                d = f"{t[:4]}-{t[4:6]}-01"
            v = r.get("DATA_VALUE","")
            if v in ("",None,"-"): continue
            results.append({"ref_date":d,"indicator":name,"value":float(str(v).replace(",","")),"unit":unit})
        logger.info(f"ECOS {name}: {len(results)}건")
    except Exception as e:
        logger.error(f"ECOS 실패 {name}: {e}")
    return results

async def run_all():
    logger.info("=== ECOS 수집 시작 ===")
    data = []
    for args in INDICATORS:
        data.extend(await fetch_indicator(*args))

    # M1/M2 비율 계산 (파생 지표)
    m1_map = {r["ref_date"]: r["value"] for r in data if r["indicator"] == "m1"}
    m2_map = {r["ref_date"]: r["value"] for r in data if r["indicator"] == "m2"}
    for d, m2_val in m2_map.items():
        m1_val = m1_map.get(d)
        if m1_val and m2_val and m2_val > 0:
            data.append({"ref_date": d, "indicator": "m1_m2_ratio", "value": round(m1_val / m2_val * 100, 4), "unit": "%"})

    logger.info(f"=== ECOS 완료: {len(data)}건 ===")
    return data
