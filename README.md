# 부동산 투자 대시보드

KB부동산 / 한국부동산원 / 한국은행 데이터를 자동 수집해  
실거주지수·가격심리·공급·경제지표를 한 화면에서 조회하는 웹 대시보드.

---

## 화면 구성 (7탭)

| 탭 | 내용 |
|----|------|
| 종합 대시보드 | 주요 KPI 카드 + 매매/전세 6개월 차트 |
| 실거주지수 ⭐ | (전세월비용/매수월비용)×100 — 매수 vs 전세 유불리 판단 |
| 가격/심리 | 매매·전세지수, 전세가율, 매수우위·전세수급지수 |
| 공급/거래 | 미분양, 입주예정, 인허가, 거래량 |
| 경제지표 | 기준금리, 주담대금리, M1/M2, GDP, 가계부채 |
| 지역비교 | 7대 도시 매매·전세지수 멀티라인 비교 |
| 인구/소득 | 총인구, 가구소득, 가계부채, HAI |

---

## 데이터 소스

| 데이터 | 출처 | 방식 | 주기 |
|--------|------|------|------|
| 매매/전세 가격지수 | 한국부동산원 Open API | API | 주간 |
| 매수우위·전세수급지수 | 한국부동산원 | API | 주간 |
| 기준금리·M1/M2·GDP | 한국은행 ECOS | API | 월간/분기 |
| 주담대·예금금리 | 한국은행 ECOS | API | 월간 |
| 미분양·거래량·인허가 | 국토교통부 Open API | API | 월간 |
| 인구·가구소득 | 통계청 KOSIS | API | 연간 |
| KB 심리지수 (보조) | KB 리브온 xlsx 수동업로드 | 파일 업로드 | 수동 |

**수집 스케줄**: 매일 오전 10:00 KST 자동 실행 (APScheduler CronTrigger)

---

## 빠른 시작 (로컬)

### 1. 사전 준비
- Docker Desktop 설치
- Node.js 20+ 설치
- Python 3.11+ 설치

### 2. API 키 발급 (모두 무료)

| API | 발급 URL |
|-----|----------|
| 한국부동산원 | https://www.data.go.kr → "아파트매매 실거래가 서비스" |
| 한국은행 ECOS | https://ecos.bok.or.kr/api/ |
| 국토교통부 | https://www.data.go.kr → "미분양주택현황" |
| 통계청 KOSIS | https://kosis.kr/openapi/ |

### 3. 환경변수 설정

```bash
# backend/.env 파일에 API 키 입력
REB_API_KEY=여기에_부동산원_키
ECOS_API_KEY=여기에_ECOS_키
MOLIT_API_KEY=여기에_국토부_키
```

### 4. 백엔드 실행

```bash
# DB + Redis 시작
docker-compose up -d db redis

# Python 가상환경
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt

# Playwright 브라우저 설치 (KB 스크래핑용, 선택)
playwright install chromium

# 서버 시작
uvicorn app.main:app --reload --port 8000
```

백엔드 확인: http://localhost:8000/health  
API 문서: http://localhost:8000/docs

### 5. 프론트엔드 실행

```bash
# 새 터미널에서
cd frontend
npm install
npm run dev
```

대시보드: http://localhost:3000

---

## 프로젝트 구조

```
realestate-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 + 라우터 등록
│   │   ├── config.py            # Pydantic Settings (API 키, DB URL)
│   │   ├── database.py          # AsyncSQLAlchemy 엔진/세션
│   │   ├── scheduler.py         # APScheduler (매일 10시)
│   │   ├── api/                 # REST 엔드포인트
│   │   │   ├── price_index.py   # /api/v1/price-index/reb|kb|sentiment
│   │   │   ├── living_index.py  # /api/v1/living-index
│   │   │   ├── economy.py       # /api/v1/economy
│   │   │   ├── supply.py        # /api/v1/supply
│   │   │   ├── admin.py         # /api/v1/admin/status|trigger
│   │   │   └── upload.py        # /api/v1/upload/kb
│   │   ├── collectors/          # 데이터 수집기
│   │   │   ├── reb_collector.py # 한국부동산원 Open API
│   │   │   ├── ecos_collector.py# 한국은행 ECOS API
│   │   │   └── molit_collector.py# 국토교통부 Open API
│   │   ├── calculators/         # 파생지표 계산
│   │   │   ├── living_index.py  # 실거주지수
│   │   │   └── bubble_index.py  # 버블지수
│   │   ├── services/
│   │   │   └── data_service.py  # DB upsert + 재계산 오케스트레이션
│   │   └── models/              # SQLAlchemy ORM
│   │       ├── price_index.py
│   │       ├── economy.py
│   │       ├── supply.py
│   │       └── calculated.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                     # ← API 키 입력 (Git 제외)
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 라우팅 (react-router-dom)
│   │   ├── pages/               # 7개 탭 페이지
│   │   ├── components/          # 공통 컴포넌트 (KPICard, 차트)
│   │   ├── hooks/useApi.ts      # React Query 훅
│   │   ├── lib/api.ts           # Axios 클라이언트
│   │   └── types/index.ts       # TypeScript 타입
│   └── package.json
├── docker-compose.yml           # PostgreSQL + Redis + Backend
└── .gitignore
```

---

## 실거주지수 계산 공식

```
전세월비용 = 전세지수 × 전세가율 × (전월세전환율 / 100) / 12
매수월비용 = 매매지수 × (1 - 전세가율) × (주담대금리 / 100) / 12

실거주지수 = (전세월비용 / 매수월비용) × 100

해석:
  100 이하 → 매수 유리 (전세비용 < 매수비용)
  100 초과 → 전세 유리 (전세비용 > 매수비용)
```

---

## 배포 (추후)
- **Frontend**: Vercel (GitHub 연동 자동 빌드)
- **Backend**: Railway (`railway up`, PostgreSQL addon 포함)
- 환경변수는 각 플랫폼 대시보드에서 설정
