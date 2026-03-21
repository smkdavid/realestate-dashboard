import asyncio, httpx

API_KEY = "S94WSHTRI7AMBSTW8TPV"

async def main():
    # 접근 가능한 전체 통계표 목록 조회 (키워드 없이)
    url = f"https://ecos.bok.or.kr/api/StatisticTableList/{API_KEY}/json/kr/1/200/"
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(url)
        j = r.json()
        if "StatisticTableList" in j:
            rows = j["StatisticTableList"].get("row", [])
            print(f"총 {j['StatisticTableList'].get('list_total_count',0)}개 중 {len(rows)}개 표시")
            for row in rows:
                print(f"  {row.get('STAT_CODE',''):12s}  {row.get('STAT_NAME','')}")
        else:
            print(j)

asyncio.run(main())
