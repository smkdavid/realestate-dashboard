"""
APScheduler — 매일 오전 10시 자동 수집
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


async def collect_all():
    """매일 10:00 KST 실행 — 수집 → 저장 → 지수 계산"""
    logger.info("일일 데이터 수집 시작")
    from app.database import async_session_maker
    from app.collectors import reb_collector, ecos_collector, molit_collector
    from app.collectors import kb_api_collector
    from app.services.data_service import (
        upsert_reb_price, upsert_economy, upsert_supply,
        upsert_kb_price, upsert_kb_sentiment,
        recalculate_living_index,
    )

    async with async_session_maker() as db:
        try:
            # 1. 한국부동산원 주간 지수 (dict 반환 → 리스트로 합치기)
            reb_data = await reb_collector.run_all()
            reb_rows = reb_data.get("buy_index", []) + reb_data.get("rent_index", [])
            if reb_rows:
                await upsert_reb_price(db, reb_rows)

            # 2. 한국은행 ECOS 경제지표 (list 반환)
            ecos_rows = await ecos_collector.run_all()
            if ecos_rows:
                await upsert_economy(db, ecos_rows)

            # 3. 국토부 공급/거래 (dict 반환 → 리스트로 합치기)
            molit_data = await molit_collector.run_all()
            molit_rows = molit_data.get("unsold", []) + molit_data.get("trade_volume", [])
            if molit_rows:
                await upsert_supply(db, molit_rows)

            # 4. KB 부동산 API 수집
            kb_data = await kb_api_collector.run_all()
            kb_price = kb_data.get("price", [])
            kb_sent = kb_data.get("sentiment", [])
            if kb_price:
                await upsert_kb_price(db, kb_price)
            if kb_sent:
                await upsert_kb_sentiment(db, kb_sent)

            # 5. 실거주지수 재계산
            await recalculate_living_index(db)

            logger.info("일일 수집 완료")

        except Exception as e:
            logger.error(f"일일 수집 실패: {e}", exc_info=True)
            await db.rollback()


def start():
    scheduler.add_job(
        collect_all,
        CronTrigger(
            hour=settings.COLLECT_HOUR,
            minute=settings.COLLECT_MINUTE,
            timezone="Asia/Seoul",
        ),
        id="daily_collect",
        replace_existing=True,
        misfire_grace_time=3600,  # 1시간 내 재시도
    )
    scheduler.start()
    logger.info(
        f"스케줄러 시작: 매일 {settings.COLLECT_HOUR:02d}:{settings.COLLECT_MINUTE:02d} KST"
    )


def stop():
    scheduler.shutdown(wait=False)
