import asyncio, httpx

API_KEY = "S94WSHTRI7AMBSTW8TPV"

# 정확한 stat_code 확인됨, item코드 조회
STATS = [
    ("121Y006", "M", "예금은행 대출금리(신규)"),
    ("121Y002", "M", "예금은행 수신금리(신규)"),
    ("161Y006", "M", "M2 상품별(평잔 원계열)"),
    ("901Y054", "M", "은행대출금 연체율(1일이상)"),
    ("721Y001", "M", "시장금리(월)"),
    ("901Y009", "M", "CPI"),
]

async def get_items(stat_code, freq, name):
    url = f"https://ecos.bok.or.kr/api/StatisticSearch/{API_KEY}/json/kr/1/20/{stat_code}/{freq}/202401/202402"
    async with httpx.AsyncClient(timeout=10) as c:
        try:
            r = await c.get(url)
            j = r.json()
            if "StatisticSearch" in j:
                rows = j["StatisticSearch"].get("row", [])
                print(f"\n[{name}] ({stat_code}) - {len(rows)}개 항목")
                seen = set()
                for row in rows:
                    k = (row.get("ITEM_CODE1",""), row.get("ITEM_NAME1",""))
                    if k not in seen:
                        seen.add(k)
                        print(f"  {k[0]:15s}  {k[1]}")
            else:
                print(f"\n[{name}] ({stat_code}) - {j.get('RESULT',{}).get('MESSAGE','?')}")
        except Exception as e:
            print(f"\n[{name}] ({stat_code}) - error: {e}")

async def main():
    for stat_code, freq, name in STATS:
        await get_items(stat_code, freq, name)

asyncio.run(main())
