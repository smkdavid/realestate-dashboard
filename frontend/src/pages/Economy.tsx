import { useState } from 'react'
import { KPICard } from '@/components/KPICard'
import { LineChart } from '@/components/charts/LineChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useEconomy, useEconomyLatest } from '@/hooks/useApi'
import { fmt2, fmtDate } from '@/lib/utils'
import { DateRangePicker } from '@/components/DateRangePicker'

const SOURCE_BOK = '한국은행 ECOS (월간)'
const SOURCE_BOK_Q = '한국은행 ECOS (분기)'

interface EcoChartProps {
  indicator: string
  title: string
  color: string
  unit?: string
  info?: string
  weeks?: number
  range?: { startDate: string; endDate: string }
  source?: string
}

function EcoChart({ indicator, title, color, unit, info, weeks = 60, range, source = SOURCE_BOK }: EcoChartProps) {
  const { data, isLoading } = useEconomy(indicator, weeks, range)
  const series = data
    ? [{ name: title, data: data.map((d: any) => [d.date, d.value] as [string, number]) }]
    : []
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}{unit ? ` (${unit})` : ''}
          {info && <span className="text-xs font-normal text-muted-foreground">{info}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : (
          <LineChart series={series} height={240} colors={[color]}
            yFormatter={v => unit === '%' ? v.toFixed(2) + '%' : v.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            source={source}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default function Economy() {
  const { data: latest, isLoading } = useEconomyLatest()
  const [preset, setPreset] = useState('260')
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  const range = preset === 'custom' && startDate && endDate
    ? { startDate, endDate }
    : undefined
  const weeks = preset === 'custom' ? 260 : parseInt(preset)

  const get = (indicator: string) => latest?.[indicator]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">경제지표</h1>
        <DateRangePicker
          preset={preset}
          onPresetChange={setPreset}
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KPICard
            title="기준금리"
            value={get('base_rate') ? fmt2(get('base_rate').value) : '-'}
            unit="%"
            subLabel={fmtDate(get('base_rate')?.date)}
            info="한국은행 금융통화위원회가 결정하는 정책금리. 시중 대출·예금금리의 기준점."
          />
          <KPICard
            title="주담대금리"
            value={get('mortgage_rate') ? fmt2(get('mortgage_rate').value) : '-'}
            unit="%"
            info="주택담보대출 평균금리. 부동산 구매 비용과 직결되며 수요에 영향을 줌."
          />
          <KPICard
            title="M1/M2 비율"
            value={get('m1_m2_ratio') ? fmt2(get('m1_m2_ratio').value) : '-'}
            unit="%"
            subLabel={fmtDate(get('m1_m2_ratio')?.date)}
            info="협의통화(M1) ÷ 광의통화(M2). 높을수록 현금성 유동성 비중 큼 → 투자 대기자금 신호."
          />
          <KPICard
            title="M2"
            value={get('m2') ? (get('m2').value / 1000).toFixed(0) : '-'}
            unit="조원"
            info="광의통화(M2) 잔액. 시중에 풀린 유동성 지표. 증가할수록 부동산 가격 상승 압력이 높아질 수 있음."
          />
          <KPICard
            title="회사채(AA-) 3년"
            value={get('corp_bond_3y') ? fmt2(get('corp_bond_3y').value) : '-'}
            unit="%"
            subLabel={fmtDate(get('corp_bond_3y')?.date)}
            info="AA- 등급 회사채 3년물 금리. 신용위험을 반영한 시장금리의 기준으로 주담대금리와 연동."
          />
        </div>
      )}

      {/* 두 번째 KPI 행 */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KPICard
            title="예금금리"
            value={get('deposit_rate') ? fmt2(get('deposit_rate').value) : '-'}
            unit="%"
            info="정기예금(1년) 평균 금리. 높을수록 자산을 부동산 대신 예금에 묻어두는 유인이 커짐."
          />
          <KPICard
            title="국고채 3년"
            value={get('bond_3y') ? fmt2(get('bond_3y').value) : '-'}
            unit="%"
            info="3년 만기 국고채 금리. 중기 시장금리의 기준점으로 주담대금리와 밀접하게 연동됨."
          />
          <KPICard
            title="GDP 성장률"
            value={get('gdp_growth') ? fmt2(get('gdp_growth').value) : '-'}
            unit="%"
            subLabel={fmtDate(get('gdp_growth')?.date)}
            info="실질 GDP 전기 대비 성장률. 경기 방향성의 핵심 선행지표."
          />
          <KPICard
            title="외환보유액"
            value={get('fx_reserves') ? (get('fx_reserves').value / 1000).toFixed(0) : '-'}
            unit="십억달러"
            subLabel={fmtDate(get('fx_reserves')?.date)}
            info="외환보유액 합계. 외환위기 방어력 척도. 급감 시 금융불안 신호."
          />
          <KPICard
            title="가계대출 연체율"
            value={get('household_delinquency') ? fmt2(get('household_delinquency').value) : '-'}
            unit="%"
            info="연체율 상승은 경기 침체 및 강제 매물 증가 신호."
          />
        </div>
      )}

      {/* 금리 차트 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EcoChart indicator="base_rate" title="기준금리" color="#f87171" unit="%" weeks={weeks} range={range}
          info="인상 → 대출 비용 증가 → 부동산 수요 억제" />
        <EcoChart indicator="mortgage_rate" title="주택담보대출금리" color="#fb923c" unit="%" weeks={weeks} range={range}
          info="실수요자 구매 부담 척도" />
        <EcoChart indicator="corp_bond_3y" title="회사채 3년(AA-)" color="#c084fc" unit="%" weeks={weeks} range={range}
          info="신용위험 반영 시장금리. 국고채 대비 스프레드 확대 시 신용경색 신호" />
        <EcoChart indicator="bond_3y" title="국고채 3년" color="#818cf8" unit="%" weeks={weeks} range={range}
          info="시장의 중기 금리 기대 반영" />
        <EcoChart indicator="deposit_rate" title="정기예금금리(1년)" color="#60a5fa" unit="%" weeks={weeks} range={range}
          info="예금금리 상승 시 부동산 매력도 감소" />
      </div>

      {/* 유동성 차트 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EcoChart indicator="m1" title="M1 협의통화" color="#34d399" weeks={weeks} range={range}
          info="현금+요구불예금. 즉시 사용 가능한 단기 유동성" />
        <EcoChart indicator="m2" title="M2 광의통화" color="#2dd4bf" weeks={weeks} range={range}
          info="M1 + 정기예금·MMF 등. 광의의 시중 유동성" />
        <EcoChart indicator="m1_m2_ratio" title="M1/M2 비율" color="#f59e0b" unit="%" weeks={weeks} range={range}
          info="상승 = 투자 대기자금 증가 → 부동산 수요 자극 가능성" />
        <EcoChart indicator="household_loan" title="가계대출 잔액" color="#fb7185" weeks={weeks} range={range}
          info="가계의 부채 총량. 과도한 증가는 부동산 버블 신호" />
        <EcoChart indicator="household_delinquency" title="가계대출 연체율" color="#f87171" unit="%" weeks={weeks} range={range}
          info="연체율 상승은 경기 침체 및 강제 매물 증가 신호" />
      </div>

      {/* 거시경제 차트 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EcoChart indicator="gdp_growth" title="실질GDP 성장률(전기대비)" color="#a78bfa" unit="%" weeks={weeks} range={range}
          source={SOURCE_BOK_Q} info="분기별 경제성장률. 0 이하 시 경기침체" />
        <EcoChart indicator="fx_reserves" title="외환보유액" color="#38bdf8" weeks={weeks} range={range}
          info="외환위기 방어력. 급격한 감소는 환율·금리 불안정 신호" />
        <EcoChart indicator="cpi" title="소비자물가지수(CPI)" color="#e879f9" weeks={weeks} range={range}
          info="물가 수준. 인플레이션 지속 시 기준금리 인상 압력" />
      </div>
    </div>
  )
}
