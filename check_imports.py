import sys, os
sys.path.insert(0, r"C:\Users\smk20\realestate-dashboard\backend")
os.chdir(r"C:\Users\smk20\realestate-dashboard\backend")

modules = [
    "app.config",
    "app.database",
    "app.models",
    "app.collectors.ecos_collector",
    "app.collectors.reb_collector",
    "app.collectors.molit_collector",
    "app.services.data_service",
    "app.api.admin",
    "app.api.price_index",
    "app.api.living_index",
    "app.api.economy",
    "app.api.supply",
    "app.api.upload",
    "app.scheduler",
    "app.main",
]
ok, fail = 0, 0
for m in modules:
    try:
        __import__(m)
        print(f"  OK  {m}")
        ok += 1
    except Exception as e:
        print(f"  XX  {m}  =>  {e}")
        fail += 1

print(f"\n결과: {ok} OK / {fail} FAIL")
