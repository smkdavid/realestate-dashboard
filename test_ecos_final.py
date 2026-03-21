"""실제 collector 와 동일한 URL 포맷으로 테스트"""
import asyncio, httpx
from datetime import date

API_KEY = "S94WSHTRI7AMBSTW8TPV"
BASE_URL = "https://ecos.bok.or.kr/api/StatisticSearch"

INDICATORS = [
    ("722Y001","M","0101000",    "", "base_rate"),
    ("121Y006","M","BECBLA0302", "", "mortgage_rate"),
    ("121Y002","M","BEABAA2118", "", "deposit_rate"),
    ("161Y006","M","BBHA00",     "", "m2"),
    ("901Y009","M","0",          "", "cpi"),
    ("721Y001","M","5020000",    "", "bond_3y"),
    ("901Y054","M","MO3AB",      "", "household_delinquency"),
]

def _period(freq):
    t = date.today()
    if freq == "Q":
        return f"{t.year-3}Q1", f"{t.year}Q4"
    return f"{t.year-3}{t.month:02d}", f"{t.year}{t.month:02d}"

async def test():
    async with httpx.AsyncClient(timeout=15) as c:
        for stat_code, freq, item1, item2, name in INDICATORS:
            start, end = _period(freq)
            url = f"{BASE_URL}/{API_KEY}/json/kr/1/1000/{stat_code}/{freq}/{start}/{end}/{item1}/{item2 or '-'}"
            r = await c.get(url)
            j = r.json()
            rows = j.get("StatisticSearch", {}).get("row", [])
            code = j.get("RESULT", {}).get("CODE", "")
            if rows:
                print(f"OK  {name:30s} {len(rows)}rows  latest={rows[-1].get('DATA_VALUE')} ({rows[-1].get('TIME')})")
            else:
                print(f"XX  {name:30s} {code} | url_period={start}~{end}")

asyncio.run(test())
