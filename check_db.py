import sqlite3, os
db_path = r"C:\Users\smk20\realestate-dashboard\backend\realestate.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=== economy_index 전체 건수 ===")
cur.execute("SELECT COUNT(*) FROM economy_index")
print(cur.fetchone())

print("\n=== indicator 목록 및 건수 ===")
cur.execute("SELECT indicator, COUNT(*), MIN(ref_date), MAX(ref_date) FROM economy_index GROUP BY indicator ORDER BY indicator")
for row in cur.fetchall():
    print(f"  {row[0]:30s} {row[1]:3d}건  {row[2]} ~ {row[3]}")

conn.close()
