import sys
print("Python:", sys.executable)
print("Version:", sys.version)

packages = ["aiosqlite", "fastapi", "sqlalchemy", "httpx", "apscheduler"]
for pkg in packages:
    try:
        mod = __import__(pkg.replace("-", "_"))
        ver = getattr(mod, "__version__", "installed")
        print(f"  OK  {pkg} = {ver}")
    except ImportError:
        print(f"  XX  {pkg} = NOT INSTALLED")
