import { useState } from 'react'
import { LineChart } from '@/components/charts/LineChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useKbPriceIndex, useKbSentiment } from '@/hooks/useApi'
import { Select } from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'

const SOURCE_KB = 'KB국민은행 리브온 (주간)'

const COMPARE_REGIONS = [
  { code: '0000', name: '전국' },
  { code: '1100', name: '서울' },
  { code: '4100', name: '경기' },
  { code: '2300', name: '인천' },
  { code: '2600', name: '부산' },
  { code: '2700', name: '대구' },
]

const COLORS = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb923c']

const INDICATOR_OPTIONS = [
  { value: 'buy', label: '매매지수' },
  { value: 'rent', label: '전세지수' },
  { value: 'sentiment', label: '매수우위지수' },
]

// 각 지역별 KB 가격지수 (조건부 hook 불가 → 고정 6개)
function usePriceByRegions(priceType: string, weeks: number, range?: { startDate: string; endDate: string }) {
  const q0 = useKbPriceIndex(COMPARE_REGIONS[0].code, priceType, weeks, range)
  const q1 = useKbPriceIndex(COMPARE_REGIONS[1].code, priceType, weeks, range)
  const q2 = useKbPriceIndex(COMPARE_REGIONS[2].code, priceType, weeks, range)
  const q3 = useKbPriceIndex(COMPARE_REGIONS[3].code, priceType, weeks, range)
  const q4 = useKbPriceIndex(COMPARE_REGIONS[4].code, priceType, weeks, range)
  const q5 = useKbPriceIndex(COMPARE_REGIONS[5].code, priceType, weeks, range)
  return [q0, q1, q2, q3, q4, q5]
}

function useSentimentByRegions(weeks: number, range?: { startDate: string; endDate: string }) {
  const q0 = useKbSentiment(COMPARE_REGIONS[0].code, weeks, range)
  const q1 = useKbSentiment(COMPARE_REGIONS[1].code, weeks, range)
  const q2 = useKbSentiment(COMPARE_REGIONS[2].code, weeks, range)
  const q3 = useKbSentiment(COMPARE_REGIONS[3].code, weeks, range)
  const q4 = useKbSentiment(COMPARE_REGIONS[4].code, weeks, range)
  const q5 = useKbSentiment(COMPARE_REGIONS[5].code, weeks, range)
  return [q0, q1, q2, q3, q4, q5]
}

export default function RegionCompare() {
  const [indicator, setIndicator] = useState('buy')
  const [preset, setPreset] = useState('260')
  const [startDate, setStartDate] = useState('2022-01-01')
  const [endDate, setEndDate] = useState('2023-07-10')

  const range = preset === 'custom' && startDate && endDate
    ? { startDate, endDate }
    : undefined
  const weeks = preset === 'custom' ? 200 : parseInt(preset)

  const priceQueries = usePriceByRegions(indicator === 'sentiment' ? 'buy' : indicator, weeks, range)
  const sentQueries = useSentimentByRegions(weeks, range)

  const isSentiment = indicator === 'sentiment'
  const queries = isSentiment ? sentQueries : priceQueries
  const isLoading = queries.some(q => q.isLoading)

  const series = queries
    .map((q, i) => {
      if (!q.data) return null
      return {
        name: COMPARE_REGIONS[i].name,
        data: isSentiment
          ? q.data.map((d: any) => [d.date, d.buyer_seller] as [string, number])
          : q.data.map((d: any) => [d.date, d.value] as [string, number]),
      }
    })
    .filter(Boolean) as { name: string; data: [string, number][] }[]

  const selectedLabel = INDICATOR_OPTIONS.find(o => o.value === indicator)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">지역별 비교</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={indicator}
            onChange={e => setIndicator(e.target.value)}
            options={INDICATOR_OPTIONS}
          />
          <DateRangePicker
            preset={preset}
            onPresetChange={setPreset}
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>
      </div>

      {/* 선택 지표의 지역별 비교 */}
      <Card>
        <CardHeader>
          <CardTitle>
            지역별 {selectedLabel} 비교
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {isSentiment ? '100 기준 — 이상이면 매수 우위' : '2022년 1월 = 100 기준'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Spinner /> : (
            <LineChart
              series={series}
              height={380}
              colors={COLORS}
              referenceLine={isSentiment ? 100 : undefined}
              source={SOURCE_KB}
            />
          )}
        </CardContent>
      </Card>

      {/* 매매 vs 전세 나란히 보기 */}
      {!isSentiment && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SideBySideCard type="buy" label="매매지수" weeks={weeks} range={range} />
          <SideBySideCard type="rent" label="전세지수" weeks={weeks} range={range} />
        </div>
      )}
    </div>
  )
}

function SideBySideCard({ type, label, weeks, range }: {
  type: string; label: string; weeks: number; range?: { startDate: string; endDate: string }
}) {
  const queries = usePriceByRegions(type, weeks, range)
  const isLoading = queries.some(q => q.isLoading)
  const series = queries
    .map((q, i) => q.data ? {
      name: COMPARE_REGIONS[i].name,
      data: q.data.map((d: any) => [d.date, d.value] as [string, number]),
    } : null)
    .filter(Boolean) as { name: string; data: [string, number][] }[]

  return (
    <Card>
      <CardHeader><CardTitle>지역별 {label}</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : (
          <LineChart series={series} height={280} colors={COLORS} source={SOURCE_KB} />
        )}
      </CardContent>
    </Card>
  )
}
