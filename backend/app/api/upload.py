from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
import io, openpyxl, logging, tempfile, os
from pathlib import Path

router = APIRouter(prefix='/upload', tags=['upload'])
logger = logging.getLogger(__name__)


@router.post('/kb')
async def upload_kb(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(400, 'xlsx 파일만 허용됩니다')

    content = await file.read()

    # 임시 파일에 저장 후 파싱 (openpyxl read_only는 파일 경로 또는 BytesIO 지원)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # KB 파일 파싱
        from app.collectors.kb_collector import _parse_price_sheet, _parse_sentiment_sheet
        wb = openpyxl.load_workbook(tmp_path, read_only=True, data_only=True)

        required = {'매매지수', '전세지수', '3. 매수매도심리', '4. 전세수급'}
        missing = required - set(wb.sheetnames)
        if missing:
            raise HTTPException(400, f'필수 시트 없음: {missing}')

        price_buy = _parse_price_sheet(wb, '매매지수', 'buy', '매매증감')
        price_rent = _parse_price_sheet(wb, '전세지수', 'rent', '전세증감')
        sentiment = _parse_sentiment_sheet(wb)
        wb.close()

        # DB 저장
        from app.services.data_service import upsert_kb_price, upsert_kb_sentiment, recalculate_living_index
        price_rows = price_buy + price_rent
        cnt_price = await upsert_kb_price(db, price_rows) if price_rows else 0
        cnt_sent = await upsert_kb_sentiment(db, sentiment) if sentiment else 0
        await recalculate_living_index(db)

        total = cnt_price + cnt_sent
        logger.info(f'KB 파일 업로드 완료: 가격 {cnt_price}건, 심리 {cnt_sent}건')
        return {
            'filename': file.filename,
            'rows_inserted': total,
            'price_rows': cnt_price,
            'sentiment_rows': cnt_sent,
            'status': 'ok',
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'KB 업로드 처리 오류: {e}', exc_info=True)
        raise HTTPException(500, f'파일 처리 오류: {e}')
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
