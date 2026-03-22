import { useState } from 'react'
import { KPICard } from '@/components/KPICard'
import { LineChart } from '@/components/charts/LineChart'
import { RegionSelector } from '@/components/RegionSelector'
import { Spinner } from '@/components/ui/spinner'
import { useKbPriceIndex, useKbSentiment, useEconomyLatest, useLivingIndexLatest } from '@/hooks/useApi'
import { fmt2, fmtDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker, presetToParams } from '@/components/DateRangePicker'

const SOURCE_KB = 'KB국민은행 리브온 (주간)'

export default function Dashboard() {
  const [region, setRegion] = useState('0000')
  const [preset, setPreset] = useState('260w')
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  const params = presetToParams(preset, startDate, endDate)
  const range = params.start_date && params.end_date
    ? { startDate: params.start_date, endDate: params.end_date }
    : undefined
  const weeks = params.days ? Math.round(params.days / 7) : 260

  const { data: buyData, isLoading: loadBuy } = useKbPriceIndex(region, 'buy', weeks, range)
  const { data: rentData } = useKbPriceIndex(region, 'rent', weeks, range)
  const { data: sentiment } = useKbSentiment(region, weeks, range)
  const { data: ecoLatest } = useEconomyLatest()
  const { data: livingLatest } = useLivingIndexLatest()

  const latestBuy = buyData?.at(-1)
  const latestRent = rentData?.at(-1)
  const latestSentiment = sentiment?.at(-1)
  const baseRate = ecoLatest?.['base_rate']
  const latestLiving = Array.isArray(livingLatest)
    ? livingLatest.find((l: any) => l.region_code === region)
    : livingLatest?.[region]

  const buySeries = buyData
    ? [{ name: '매매지수', data: buyData.map((d: any) => [d.date, d.value] as [string, number]) }]
    : []
  const rentSeries = rentData
    ? [{ name: '전세지수', data: rentData.map((d: any) => [d.date, d.value] as [string, number]) }]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">종합 대시보드</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <RegionSelector value={region} onChange={setRegion} />
          <DateRangePicker
            preset={preset}
            onPresetChange={setPreset}
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
          {latestBuy && <span>기준: {fmtDate(latestBuy.date)}</span>}
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          title="매매지수"
          value={latestBuy ? fmt2(latestBuy.value) : '-'}
          change={latestBuy?.change}
          subLabel="주간변동"
          info="KB국민은행이 주간 조사하는 아파트 매매가격지수. 2022년 1월=100 기준. 100 이상이면 기준 시점 대비 가격 상승."
        />
        <KPICard
          title="전세지수"
          value={latestRent ? fmt2(latestRent.value) : '-'}
          change={latestRent?.change}
          subLabel="주간변동"
          info="KB국민은행이 주간 조사하는 아파트 전세가격지수. 2022년 1월=100 기준."
        />
        <KPICard
          title="매수우위지수"
          value={latestSentiment ? fmt2(latestSentiment.buyer_seller) : '-'}
          subLabel="100 이상=매수우위"
          valueClassName={latestSentiment?.buyer_seller > 100 ? 'text-red-400' : 'text-blue-400'}
          info="매수 의향자 vs 매도 의향자 비율 지수. 100 이상이면 매수 우위(가격 상승 압력), 100 미만이면 매도 우위(가격 하락 압력)."
        />
        <KPICard
          title="전세수급지수"
          value={latestSentiment ? fmt2(latestSentiment.jeonse_supply) : '-'}
          subLabel="100 이상=수요우위"
          valueClassName={latestSentiment?.jeonse_supply > 100 ? 'text-red-400' : 'text-blue-400'}
          info="전세 수요 대비 공급 상황 지수. 100 이상이면 수요 > 공급(전세가 상승 압력), 100 미만이면 공급 우위."
        />
        <KPICard
          title="기준금리"
          value={baseRate ? fmt2(baseRate.value) : '-'}
          unit="%"
          subLabel="한국은행"
          info="한국은행 금융통화위원회가 결정하는 정책금리. 금리 인상 시 대출 비용 증가로 부동산 수요 억제. 인하 시 반대 효과."
        />
      </div>

      {/* 실거주지수 KPI */}
      {latestLiving && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KPICard
            title="실거주지수"
            value={fmt2(latestLiving.living_index)}
            unit=""
            subLabel={latestLiving.living_index <= 100 ? '매수 유리' : '전세 유리'}
            valueClassName={latestLiving.living_index <= 100 ? 'text-blue-400' : 'text-amber-400'}
            info="전세 거주 비용(보증금 기회비용+월세환산)과 매수 비용(매매가+주담대 이자)을 비교한 지수. 100 미만이면 사는 게 유리, 이상이면 전세가 유리."
          />
          <KPICard
            title="전세가율"
            value={fmt2(latestLiving.jeonse_ratio * 100)}
            unit="%"
            subLabel="매매 대비 전세가"
            info="매매가 대비 전세가 비율. 70% 이상이면 전세 수요 강세 신호. 높을수록 갭투자 위험 증가."
          />
          <KPICard
            title="주담대금리"
            value={fmt2(latestLiving.mortgage_rate)}
            unit="%"
            subLabel="주택담보대출"
            info="주택담보대출 평균 금리. 실수요자의 구매 부담을 결정하는 핵심 변수."
          />
        </div>
      )}

      {/* 차트 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>매매지수 추이</CardTitle></CardHeader>
          <CardContent>
            {loadBuy ? <Spinner /> : <LineChart series={buySeries} height={260} source={SOURCE_KB} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>전세지수 추이</CardTitle></CardHeader>
          <CardContent>
            <LineChart series={rentSeries} height={260} colors={['#f87171']} source={SOURCE_KB} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
