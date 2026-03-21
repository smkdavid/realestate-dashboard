import asyncio, httpx

API_KEY = "S94WSHTRI7AMBSTW8TPV"

# 후보 stat_code 목록 - item1 없이 전체 조회
CANDIDATES = [
    ("722Y001", "M", "0101000", "", "기준금리"),
    ("901Y009", "M", "0",       "", "CPI 총지수"),
    ("028Y001", "M", "",        "", "주담대 후보1"),
    ("028Y002", "M", "",        "", "주담대 후보2"),
    ("098Y001", "M", "",        "", "예금은행 수신금리"),
    ("098Y002", "M", "",        "", "예금은행 대출금리"),
    ("098Y007", "M", "",        "", "비은행 대출금리"),
    ("101Y002", "M", "",        "", "M1 협의통화"),
    ("101Y003", "M", "",        "", "M2 광의통화"),
    ("111Y002", "Q", "10101",   "", "GDP성장률"),
    ("111Y003", "Q", "",        "", "GDP 후보"),
    ("902Y001", "M", "",        "", "외환보유액 후보1"),
    ("902Y002", "M", "KR",      "", "외환보유액 현재"),
    ("021Y125", "M", "",        "", "주택담보대출 후보"),
    ("033Y001", "M", "",        "", "가계대출 후보"),
]

async def test_stat(stat_code, freq, item1, item2, name):
    start = "202601" if freq == "M" else "2026Q1"
    end   = "202603" if freq == "M" else "2026Q4"
    if item1:
        item2_part = item2 if item2 else "-"
        url = f"https://ecos.bok.or.kr/api/StatisticSearch/{API_KEY}/json/kr/1/3/{stat_code}/{freq}/{start}/{end}/{item1}/{item2_part}"
    else:
        url = f"https://ecos.bok.or.kr/api/StatisticSearch/{API_KEY}/json/kr/1/5/{stat_code}/{freq}/{start}/{end}"
    async with httpx.AsyncClient(timeout=10) as c:
        try:
            r = await c.get(url)
            if not r.text.strip():
                print(f"XX  {name:25s} ({stat_code}) empty")
                return
            j = r.json()
            if "StatisticSearch" in j:
                rows = j["StatisticSearch"].get("row", [])
                if rows:
                    items = [(r.get("ITEM_CODE1",""), r.get("ITEM_NAME1",""), r.get("DATA_VALUE","")) for r in rows[:3]]
                    print(f"OK  {name:25s} ({stat_code})  {len(rows)}rows  ex:{items}")
                else:
                    print(f"~~  {name:25s} ({stat_code})  rows=0 (기간 내 데이터 없음)")
            else:
                code = j.get("RESULT",{}).get("CODE","?")
                print(f"XX  {name:25s} ({stat_code})  {code}")
        except Exception as e:
            print(f"EX  {name:25s} ({stat_code})  {e}")

async def main():
    for args in CANDIDATES:
        await test_stat(*args)

asyncio.run(main())
