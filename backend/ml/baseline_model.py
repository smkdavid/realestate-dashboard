"""
부동산 가격 예측 베이스라인 모델 v2
- 목표: 1년 후 가격 증감률 예측 (MAPE 목표: 10%)
- 데이터: KB 가격지수(73개 지역) + KB 심리지수(24개 지역, 없으면 전국평균) + 기준금리
- 모델: Random Forest + Gradient Boosting 앙상블
"""

import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
import warnings
warnings.filterwarnings('ignore')

DB_PATH = 'realestate.db'
PREDICT_WEEKS = 26   # 6개월 후 예측 (데이터 104주 → MA26+예측26=52 → 유효 52주)
TRAIN_CUTOFF = '2025-01-01'  # 학습/테스트 분리 기준


def load_data():
    conn = sqlite3.connect(DB_PATH)
    buy = pd.read_sql(
        "SELECT survey_date, region_code, region_name, index_value, weekly_change, jeonse_ratio "
        "FROM kb_price_index WHERE price_type='buy' ORDER BY region_code, survey_date", conn)
    rent = pd.read_sql(
        "SELECT survey_date, region_code, index_value as rent_index "
        "FROM kb_price_index WHERE price_type='rent' ORDER BY region_code, survey_date", conn)
    sentiment = pd.read_sql(
        "SELECT survey_date, region_code, buyer_seller_index, jeonse_supply_index "
        "FROM kb_sentiment ORDER BY region_code, survey_date", conn)
    economy = pd.read_sql(
        "SELECT ref_date, value as base_rate FROM economy_index WHERE indicator='base_rate'", conn)
    conn.close()

    for d in [buy, rent, sentiment]:
        d['survey_date'] = pd.to_datetime(d['survey_date'])
    economy['ref_date'] = pd.to_datetime(economy['ref_date'])
    return buy, rent, sentiment, economy


def engineer_features(buy, rent, sentiment, economy):
    # 1. 전국(0000) 심리지수 → 전체 날짜 기준 참조 테이블
    nation_sent = sentiment[sentiment['region_code'] == sentiment['region_code'].iloc[0]].copy()
    nation_avg = sentiment.groupby('survey_date')[
        ['buyer_seller_index', 'jeonse_supply_index']].mean().reset_index()
    nation_avg.columns = ['survey_date', 'bs_national', 'js_national']

    # 2. 기준금리 (월별 → bfill+ffill)
    economy = economy.sort_values('ref_date').rename(columns={'ref_date': 'survey_date'})
    economy['survey_date'] = economy['survey_date'].dt.to_period('M').dt.to_timestamp()

    results = []
    for region_code, grp in buy.groupby('region_code'):
        grp = grp.sort_values('survey_date').reset_index(drop=True)

        # 전세지수 merge
        r_rent = rent[rent['region_code'] == region_code][['survey_date', 'rent_index']]
        grp = grp.merge(r_rent, on='survey_date', how='left')

        # 심리지수 merge (지역 있으면 지역 것, 없으면 전국 평균)
        r_sent = sentiment[sentiment['region_code'] == region_code][
            ['survey_date', 'buyer_seller_index', 'jeonse_supply_index']]
        grp = grp.merge(r_sent, on='survey_date', how='left')
        grp = grp.merge(nation_avg, on='survey_date', how='left')
        grp['buyer_seller_index'] = grp['buyer_seller_index'].fillna(grp['bs_national'])
        grp['jeonse_supply_index'] = grp['jeonse_supply_index'].fillna(grp['js_national'])

        # 기준금리 merge
        grp['year_month'] = grp['survey_date'].dt.to_period('M').dt.to_timestamp()
        grp = grp.merge(economy[['survey_date', 'base_rate']].rename(
            columns={'survey_date': 'year_month'}), on='year_month', how='left')
        grp['base_rate'] = grp['base_rate'].bfill().ffill()

        n = len(grp)

        # 이동평균 (MA26 이하로 제한)
        grp['ma4_chg']  = grp['weekly_change'].rolling(4,  min_periods=2).mean()
        grp['ma12_chg'] = grp['weekly_change'].rolling(12, min_periods=6).mean()
        grp['ma26_chg'] = grp['weekly_change'].rolling(26, min_periods=13).mean()

        # 누적 증감률
        grp['cum4w']  = grp['index_value'].pct_change(4)  * 100
        grp['cum12w'] = grp['index_value'].pct_change(12) * 100
        grp['cum26w'] = grp['index_value'].pct_change(26) * 100

        # 충전지수 (전세 - 매매)
        grp['charging'] = grp['rent_index'] - grp['index_value']
        grp['charging_ma8'] = grp['charging'].rolling(8, min_periods=4).mean()

        # 전세가율 변화
        grp['jeonse_chg4'] = grp['jeonse_ratio'].diff(4)

        # 심리지수 모멘텀
        grp['bs_ma4']    = grp['buyer_seller_index'].rolling(4, min_periods=2).mean()
        grp['bs_trend4'] = grp['buyer_seller_index'].diff(4)
        grp['js_ma4']    = grp['jeonse_supply_index'].rolling(4, min_periods=2).mean()

        # 타겟: PREDICT_WEEKS 후 증감률
        future_val = grp['index_value'].shift(-PREDICT_WEEKS)
        grp['target'] = (future_val - grp['index_value']) / grp['index_value'] * 100

        grp['region_code'] = region_code
        results.append(grp)

    return pd.concat(results, ignore_index=True)


FEATURE_COLS = [
    'index_value', 'weekly_change',
    'ma4_chg', 'ma12_chg', 'ma26_chg',
    'cum4w', 'cum12w', 'cum26w',
    'jeonse_ratio', 'jeonse_chg4',
    'rent_index', 'charging', 'charging_ma8',
    'buyer_seller_index', 'jeonse_supply_index', 'bs_ma4', 'bs_trend4', 'js_ma4',
    'base_rate',
]


def calc_mape(pred, actual, threshold=0.5):
    """증감률 MAPE: 실제 변화가 threshold% 이상인 경우만"""
    mask = np.abs(actual) > threshold
    if mask.sum() == 0:
        return np.nan
    return np.mean(np.abs(pred[mask] - actual[mask]) / np.abs(actual[mask])) * 100


def direction_accuracy(pred, actual):
    return np.mean(np.sign(pred) == np.sign(actual)) * 100


def train_and_evaluate(df):
    avail = df.dropna(subset=FEATURE_COLS + ['target'])
    X = avail[FEATURE_COLS].values
    y = avail['target'].values
    dates = avail['survey_date']
    regions = avail['region_code']

    train = dates < TRAIN_CUTOFF
    test  = dates >= TRAIN_CUTOFF

    X_tr, y_tr = X[train], y[train]
    X_te, y_te = X[test],  y[test]

    print(f"Train: {train.sum():,}개  Test: {test.sum():,}개  특성: {X.shape[1]}개")
    print(f"타겟 증감률 - 전체 평균: {y.mean():.2f}%  표준편차: {y.std():.2f}%")

    if len(X_tr) == 0:
        print("❌ 학습 데이터 없음. TRAIN_CUTOFF를 조정하세요.")
        return

    # ── 모델 학습 ─────────────────────────────────────────
    rf = RandomForestRegressor(n_estimators=300, max_depth=12,
                               min_samples_leaf=5, random_state=42, n_jobs=-1)
    rf.fit(X_tr, y_tr)

    gb = GradientBoostingRegressor(n_estimators=300, max_depth=5,
                                   learning_rate=0.05, subsample=0.8, random_state=42)
    gb.fit(X_tr, y_tr)

    rf_pred  = rf.predict(X_te)
    gb_pred  = gb.predict(X_te)
    ens_pred = (rf_pred * 0.5 + gb_pred * 0.5)

    # ── 결과 출력 ─────────────────────────────────────────
    print("\n" + "="*50)
    print(f"{'모델':<18} {'MAPE':>8} {'방향성':>8}")
    print("-"*50)
    for name, pred in [('Random Forest', rf_pred), ('Gradient Boost', gb_pred), ('앙상블(50:50)', ens_pred)]:
        mape = calc_mape(pred, y_te)
        dacc = direction_accuracy(pred, y_te)
        print(f"{name:<18} {mape:>7.1f}%  {dacc:>7.1f}%")
    print("="*50)

    best_mape = calc_mape(ens_pred, y_te)
    target = 10.0
    print(f"\n목표 MAPE {target}% 대비: {best_mape:.1f}%  "
          f"{'✅ 달성!' if best_mape <= target else f'→ {best_mape - target:.1f}%p 부족 (추가 데이터 필요)'}")

    # ── 특성 중요도 ───────────────────────────────────────
    imp = pd.DataFrame({'feature': FEATURE_COLS,
                        'importance': rf.feature_importances_}
                       ).sort_values('importance', ascending=False)
    print("\n특성 중요도 Top 10:")
    print(imp.head(10).to_string(index=False))

    # ── 주요 지역별 MAPE ─────────────────────────────────
    test_df = avail[test].copy()
    test_df['pred'] = ens_pred
    key_regions = ['0000','1100','4100','3000','2800']  # 전국, 서울, 경기, 대전, 인천
    region_names = avail.groupby('region_code')['region_name'].first().to_dict() \
        if 'region_name' in avail.columns else {}

    print("\n주요 지역별 앙상블 MAPE:")
    for rc in key_regions:
        sub = test_df[test_df['region_code'] == rc]
        if len(sub) == 0:
            continue
        m = calc_mape(sub['pred'].values, sub['target'].values)
        name = region_names.get(rc, rc)
        print(f"  {name}({rc}): {m:.1f}%  (n={len(sub)})")


if __name__ == '__main__':
    print("── 데이터 로딩 ──")
    buy, rent, sentiment, economy = load_data()
    print(f"  KB 가격지수: {len(buy):,}행 / {buy['region_code'].nunique()}개 지역  "
          f"({buy['survey_date'].min().date()} ~ {buy['survey_date'].max().date()})")
    print(f"  KB 심리지수: {len(sentiment):,}행 / {sentiment['region_code'].nunique()}개 지역")
    print(f"  기준금리:    {len(economy):,}행")

    print("\n── 특성 엔지니어링 ──")
    df = engineer_features(buy, rent, sentiment, economy)
    valid_n = df.dropna(subset=FEATURE_COLS + ['target']).shape[0]
    print(f"  유효 샘플: {valid_n:,}개")

    print("\n── 모델 학습 및 평가 ──")
    train_and_evaluate(df)
