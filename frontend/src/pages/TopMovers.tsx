import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { HorizontalBarRank } from '@/components/charts/HorizontalBarRank'
import { useKbTopMovers, useKbAvailableDates } from '@/hooks/useApi'
import { heatColorDark } from '@/lib/utils'

type PriceType = 'buy' | 'rent'

function MoverTable({ items, type }: { items: any[]; type: 'rising' | 'falling' }) {
  return (
    <table className="w-full text-sm mt-2">
      <thead>
        <tr className="text-muted-foreground text-xs border-b border-border">
          <th className="py-1 text-left w-8">#</th>
          <th className="py-1 text-left">지역</th>
          <th className="py-1 text-right">변동률(%)</th>
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
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const { data: dates } = useKbAvailableDates(priceType)
  const { data, isLoading } = useKbTopMovers(priceType, selectedDate, 10)

  const displayDate = data?.survey_date || selectedDate || (dates?.[0])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">변동률 순위</h1>
        <div className="flex items-center gap-2">
          <select
            value={priceType}
            onChange={e => setPriceType(e.target.value as PriceType)}
            className="rounded bg-card border border-border px-3 py-1.5 text-sm"
          >
            <option value="buy">매매</option>
            <option value="rent">전세</option>
          </select>
          {dates && (
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
        </div>
      </div>

      {displayDate && (
        <p className="text-sm text-muted-foreground">기준일: {displayDate}</p>
      )}

      {isLoading ? <Spinner /> : data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 상승 Top 10 */}
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
              <MoverTable items={data.rising} type="rising" />
            </CardContent>
          </Card>

          {/* 하락 Top 10 */}
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
              <MoverTable items={data.falling} type="falling" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
