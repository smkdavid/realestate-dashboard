from fastapi import APIRouter, BackgroundTasks
from datetime import datetime
import logging

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)

COLLECTORS = ["reb", "ecos", "molit", "kb", "kb-api", "all"]

collector_status: dict = {
    c: {"name": c, "last_run": None, "status": "pending", "rows_updated": 0}
    for c in ["reb", "ecos", "molit", "kb", "kb-api"]
}


async def _run_collector(name: str):
    """백그라운드에서 실제 수집 실행"""
    from app.database import async_session_maker
    from app.collectors import reb_collector, ecos_collector, molit_collector, kb_collector
    from app.collectors import kb_api_collector
    from app.services.data_service import (
        upsert_reb_price, upsert_economy, upsert_supply,
        upsert_kb_price, upsert_kb_sentiment,
        recalculate_living_index,
    )

    collector_status[name]["status"] = "running"
    collector_status[name]["last_run"] = datetime.now().isoformat()

    try:
        async with async_session_maker() as db:
            rows = []
            if name == "reb":
                data = await reb_collector.run_all()
                rows = data.get("buy_index", []) + data.get("rent_index", [])
                if rows:
                    await upsert_reb_price(db, rows)
            elif name == "ecos":
                rows = await ecos_collector.run_all()
                if rows:
                    await upsert_economy(db, rows)
            elif name == "molit":
                data = await molit_collector.run_all()
                rows = data.get("unsold", []) + data.get("trade_volume", [])
                if rows:
                    await upsert_supply(db, rows)
            elif name == "kb":
                data = await kb_collector.run_all()
                price_rows = data.get("price", [])
                sent_rows = data.get("sentiment", [])
                if price_rows:
                    await upsert_kb_price(db, price_rows)
                if sent_rows:
                    await upsert_kb_sentiment(db, sent_rows)
                rows = price_rows + sent_rows
            elif name == "kb-api":
                data = await kb_api_collector.run_all()
                price_rows = data.get("price", [])
                sent_rows = data.get("sentiment", [])
                if price_rows:
                    await upsert_kb_price(db, price_rows)
                if sent_rows:
                    await upsert_kb_sentiment(db, sent_rows)
                rows = price_rows + sent_rows

            await recalculate_living_index(db)

        collector_status[name]["status"] = "ok"
        collector_status[name]["rows_updated"] = len(rows)
        logger.info(f"[admin] {name} 수집 완료: {len(rows)}행")

    except Exception as e:
        collector_status[name]["status"] = f"error: {e}"
        logger.error(f"[admin] {name} 수집 실패: {e}", exc_info=True)


async def _run_all():
    """전체 수집"""
    from app.scheduler import collect_all
    await collect_all()
    for name in ["reb", "ecos", "molit"]:
        collector_status[name]["status"] = "ok"
        collector_status[name]["last_run"] = datetime.now().isoformat()


@router.get("/status")
async def get_status():
    return list(collector_status.values())


@router.post("/trigger/{collector}")
async def trigger_collector(collector: str, background_tasks: BackgroundTasks):
    if collector not in COLLECTORS:
        return {"error": f"unknown collector (use: {', '.join(COLLECTORS)})"}

    if collector == "all":
        for name in ["reb", "ecos", "molit", "kb"]:
            collector_status[name]["status"] = "running"
        background_tasks.add_task(_run_all)
        return {"message": "전체 수집 시작됨 (백그라운드)"}

    collector_status[collector]["status"] = "running"
    background_tasks.add_task(_run_collector, collector)
    return {"message": f"{collector} 수집 시작됨 (백그라운드)"}
