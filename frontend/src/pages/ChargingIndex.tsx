import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { DualAxisChart, DualSeries } from '@/components/charts/DualAxisChart'
import { LineChart } from '@/components/charts/LineChart'
import { useKbChargingIndex, useKbPriceRegions } from '@/hooks/useApi'
import { SearchableRegionSelector } from '@/components/SearchableRegionSelector'
import { DateRangePicker } from '@/components/DateRangePicker'

const DEFAULT_CODES = ['11000', '41000', '30000', '29000', '26000']
const DEFAULT_NAMES: Record<string, string> = {
  '11000': '서울', '41000': '경기', '30000': '대전', '29000': '광주', '26000': '부산',
}

function toTimestamp(d: string) { return new Date(d).getTime() }

const COLORS = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#e879f9', '#38bdf8']

export default function ChargingIndex() {
  const [codes, setCodes] = useState<string[]>(DEFAULT_CODES)
  const [preset, setPreset] = useState('2000')
  const [startDate, setStartDate] = useState('2010-01-01')
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  const range = preset === 'custom' && startDate && endDate
    ? { startDate, endDate }
    : undefined

  const codesStr = codes.join(',')
  const { data, isLoading } = useKbChargingIndex(
    codesStr,
    range?.startDate,
    range?.endDate,
  )

  const handleAdd = () => setCodes(prev => [...prev, '11000'])
  const handleChange = (i: number, code: string) => {
    setCodes(prev => { const n = [...prev]; n[i] = code; return n })
  }
  const handleRemove = (i: number) => {
    if (codes.length <= 1) return
    setCodes(prev => prev.filter((_, idx) => idx !== i))
  }

  // Build charging index line chart series
  const chargingSeries = (data || []).map((r: any, i: number) => ({
    name: r.region_name,
    data: r.data.map((d: any) => [d.date, d.charging_index] as [string, number]).filter(([, v]: any) => v != null),
  }))

  // Build dual-axis per region
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">충전지수</h1>
        <DateRangePicker
          preset={preset}
          onPresetChange={setPreset}
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        충전지수 = 전세지수 - 매매지수. 양수이면 전세가 매매보다 빠르게 상승 (매매 추격 에너지 축적).
      </p>

      {/* Region selectors */}
      <div className="flex flex-wrap items-center gap-2">
        {codes.map((code, i) => (
          <div key={i} className="flex items-center gap-1">
            <SearchableRegionSelector
              value={code}
              onChange={(c) => handleChange(i, c)}
              type="price"
            />
            {codes.length > 1 && (
              <button onClick={() => handleRemove(i)} className="text-xs text-muted-foreground hover:text-red-400">x</button>
            )}
          </div>
        ))}
        <button onClick={handleAdd} className="px-2 py-1 text-xs rounded bg-card border border-border hover:bg-accent">
          + 추가
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <>
          {/* 전체 충전지수 비교 */}
          <Card>
            <CardHeader>
              <CardTitle>충전지수 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                series={chargingSeries}
                height={320}
                colors={COLORS}
                referenceLine={0}
                yFormatter={v => v.toFixed(2)}
              />
            </CardContent>
          </Card>

          {/* 지역별 듀얼축 차트 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(data || []).map((r: any, i: number) => {
              const buySeries: DualSeries = {
                name: '매매지수',
                data: r.data.filter((d: any) => d.buy_index != null).map((d: any) => ({
                  x: toTimestamp(d.date), y: d.buy_index,
                })),
              }
              const rentSeries: DualSeries = {
                name: '전세지수',
                data: r.data.filter((d: any) => d.rent_index != null).map((d: any) => ({
                  x: toTimestamp(d.date), y: d.rent_index,
                })),
              }
              const chargeSeries: DualSeries = {
                name: '충전지수',
                data: r.data.filter((d: any) => d.charging_index != null).map((d: any) => ({
                  x: toTimestamp(d.date), y: d.charging_index,
                })),
                type: 'area',
              }

              return (
                <Card key={r.region_code}>
                  <CardHeader>
                    <CardTitle className="text-sm">{r.region_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DualAxisChart
                      leftSeries={[buySeries, rentSeries]}
                      rightSeries={[chargeSeries]}
                      leftLabel="가격지수"
                      rightLabel="충전지수"
                      height={240}
                      leftColors={['#f87171', '#60a5fa']}
                      rightColors={['#34d399']}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
