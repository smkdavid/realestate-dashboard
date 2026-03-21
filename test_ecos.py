import asyncio, httpx, sys, os
sys.path.insert(0, r"C:\Users\smk20\realestate-dashboard\backend")
os.chdir(r"C:\Users\smk20\realestate-dashboard\backend")

API_KEY = "S94WSHTRI7AMBSTW8TPV"
BASE_URL = "https://ecos.bok.or.kr/api/StatisticSearch"

INDICATORS = [
    ("722Y001","M","0101000","",      "base_rate"),
    ("098Y003","M","BEAF",  "",       "mortgage_rate"),
    ("098Y003","M","BECB",  "",       "deposit_rate"),
    ("101Y004","M","BBHA",  "",       "m1"),
    ("101Y004","M","BBHB",  "",       "m2"),
    ("901Y009","M","0",     "",       "cpi"),
    ("111Y002","Q","10101", "",       "gdp_growth"),
    ("104Y014","M","I12A",  "I12A10", "household_delinquency"),
    ("902Y002","M","KR",    "",       "fx_reserve"),
]

async def test():
    async with httpx.AsyncClient(timeout=15) as c:
        for stat_code, freq, item1, item2, name in INDICATORS:
            start = "202301" if freq == "M" else "2023Q1"
            end   = "202602" if freq == "M" else "2026Q4"
            item2_part = item2 if item2 else "-"
            url = f"{BASE_URL}/{API_KEY}/json/kr/1/5/{stat_code}/{freq}/{start}/{end}/{item1}/{item2_part}"
            try:
                r = await c.get(url)
                j = r.json()
                if "StatisticSearch" in j:
                    rows = j["StatisticSearch"].get("row", [])
                    sample = rows[0].get("DATA_VALUE") if rows else "none"
                    print(f"OK  {name:30s} {len(rows)}rows  sample={sample}")
                else:
                    err = j.get("RESULT", {})
                    print(f"XX  {name:30s} CODE={err.get('CODE')} MSG={err.get('MESSAGE')}")
            except Exception as e:
                print(f"EX  {name:30s} {e}")

asyncio.run(test())
