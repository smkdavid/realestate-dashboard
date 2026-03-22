import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { HorizontalBarRank } from '@/components/charts/HorizontalBarRank'
import { useKbTopMovers, useKbAvailableDates, useKbTopMoversRange } from '@/hooks/useApi'
import { DateRangePicker, presetToParams } from '@/components/DateRangePicker'

type PriceType = 'buy' | 'rent'
type Mode = 'weekly' | 'range'

function MoverTable({ items, isRange }: { items: any[]; isRange: boolean }) {
  return (
    <table className="w-full text-sm mt-2">
      <thead>
        <tr className="text-muted-foreground text-xs border-b border-border">
          <th className="py-1 text-left w-8">#</th>
          <th className="py-1 text-left">지역</th>
          <th className="py-1 text-right">{isRange ? '기간변동률(%)' : '주간변동률(%)'}</th>
          <th className="py-1 text-right">지수</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={item.region_code} className="border-b border-border/50">
            <td className="py-1.5 text-muted-foreground">{i + 1}</td>
            <td className="py-1.5">{item.region_name}</td>
            <td
              className="py-1.5 text-right font-mono font-medium"
              style={{ color: item.weekly_change >= 0 ? '#f87171' : '#60a5fa' }}
            >
              {item.weekly_change >= 0 ? '+' : ''}{item.weekly_change?.toFixed(4)}
            </td>
            <td className="py-1.5 text-right text-muted-foreground">
              {item.index_value?.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TopMovers() {
  const [priceType, setPriceType] = useState<PriceType>('buy')
  const [mode, setMode] = useState<Mode>('weekly')
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  // 기간 선택
  const [preset, setPreset] = useState('52w')
  const [startDate, setStartDate] = useState('2023-01-01')
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: dates } = useKbAvailableDates(priceType)
  const { data: weeklyData, isLoading: loadWeekly } = useKbTopMovers(priceType, selectedDate, 10)

  const rangeParams = presetToParams(preset, startDate, endDate)
  const rangeStart = rangeParams.start_date ?? (() => {
    const d = new Date()
    d.setDate(d.getDate() - (rangeParams.days ?? 365))
    return d.toISOString().slice(0, 10)
  })()
  const rangeEnd = rangeParams.end_date ?? endDate
  const { data: rangeData, isLoading: loadRange } = useKbTopMoversRange(priceType, rangeStart, rangeEnd, 10)

  const isLoading = mode === 'weekly' ? loadWeekly : loadRange
  const data = mode === 'weekly' ? weeklyData : rangeData

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">변동률 순위</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* 매매/전세 */}
          <div className="flex rounded border border-border overflow-hidden text-sm">
            <button
              onClick={() => setPriceType('buy')}
              className={`px-4 py-1.5 ${priceType === 'buy' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}
            >매매</button>
            <button
              onClick={() => setPriceType('rent')}
              className={`px-4 py-1.5 border-l border-border ${priceType === 'rent' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}
            >전세</button>
          </div>

          {/* 주간/기간 모드 */}
          <div className="flex rounded border border-border overflow-hidden text-sm">
            <button
              onClick={() => setMode('weekly')}
              className={`px-4 py-1.5 ${mode === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}
            >주간</button>
            <button
              onClick={() => setMode('range')}
              className={`px-4 py-1.5 border-l border-border ${mode === 'range' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}
            >기간</button>
          </div>

          {/* 주간 모드: 날짜 선택 */}
          {mode === 'weekly' && dates && (
            <select
              value={selectedDate || dates[0]}
              onChange={e => setSelectedDate(e.target.value)}
              className="rounded bg-card border border-border px-3 py-1.5 text-sm"
            >
              {dates.map((d: string) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {/* 기간 모드: 날짜 범위 */}
          {mode === 'range' && (
            <DateRangePicker
              preset={preset}
              onPresetChange={setPreset}
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
          )}
        </div>
      </div>

      {/* 기준 날짜 표시 */}
      {mode === 'weekly' && data?.survey_date && (
        <p className="text-sm text-muted-foreground">기준일: {data.survey_date}</p>
      )}
      {mode === 'range' && data?.start_date && data?.end_date && (
        <p className="text-sm text-muted-foreground">
          기간: {data.start_date} ~ {data.end_date}
        </p>
      )}

      {isLoading ? <Spinner /> : data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-400">
                {priceType === 'buy' ? '매매' : '전세'} 상승 Top 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarRank
                items={data.rising.map((r: any) => ({ name: r.region_name, value: r.weekly_change }))}
              />
              <MoverTable items={data.rising} isRange={mode === 'range'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-400">
                {priceType === 'buy' ? '매매' : '전세'} 하락 Top 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarRank
                items={data.falling.map((r: any) => ({ name: r.region_name, value: r.weekly_change }))}
              />
              <MoverTable items={data.falling} isRange={mode === 'range'} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
