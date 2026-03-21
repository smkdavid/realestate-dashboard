import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useKbSnapshot, useKbAvailableDates } from '@/hooks/useApi'
import { heatColorDark } from '@/lib/utils'

type PriceType = 'buy' | 'rent'

// 수도권 region codes — starts with 11(서울), 23(인천), 41(경기)
const METRO_PREFIXES = ['11', '23', '41']

function ColorBar({ maxAbs }: { maxAbs: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>-{maxAbs.toFixed(2)}</span>
      <div className="flex h-4">
        {Array.from({ length: 20 }, (_, i) => {
          const val = -maxAbs + (i / 19) * 2 * maxAbs
          return <div key={i} className="w-3 h-4" style={{ background: heatColorDark(val, maxAbs) }} />
        })}
      </div>
      <span>+{maxAbs.toFixed(2)}</span>
    </div>
  )
}

interface RegionCell {
  region_code: string
  region_name: string
  weekly_change: number | null
}

function RegionTile({ r, maxAbs }: { r: RegionCell; maxAbs: number }) {
  const bg = heatColorDark(r.weekly_change, maxAbs)
  const bright = r.weekly_change != null && Math.abs(r.weekly_change) > maxAbs * 0.5
  const color = bright ? '#fff' : '#d1d5db'

  return (
    <div
      className="flex flex-col items-center justify-center rounded p-1 min-w-[68px] h-[44px]"
      style={{ background: bg }}
      title={`${r.region_name}: ${r.weekly_change != null ? r.weekly_change.toFixed(4) : 'N/A'}`}
    >
      <span className="text-[10px] font-medium leading-tight" style={{ color }}>
        {r.region_name.length > 5 ? r.region_name.slice(0, 5) : r.region_name}
      </span>
      <span className="text-[9px] font-mono leading-tight" style={{ color }}>
        {r.weekly_change != null
          ? (r.weekly_change >= 0 ? '+' : '') + r.weekly_change.toFixed(3)
          : '-'}
      </span>
    </div>
  )
}

export default function MetroMap() {
  const [priceType, setPriceType] = useState<PriceType>('buy')
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const { data: dates } = useKbAvailableDates(priceType)
  const { data, isLoading } = useKbSnapshot(priceType, selectedDate)

  const metroRegions = useMemo(() => {
    if (!data?.data) return { seoul: [] as RegionCell[], incheon: [] as RegionCell[], gyeonggi: [] as RegionCell[] }
    const all = data.data as RegionCell[]
    return {
      seoul: all.filter(r => r.region_code.startsWith('11')),
      incheon: all.filter(r => r.region_code.startsWith('23')),
      gyeonggi: all.filter(r => r.region_code.startsWith('41')),
    }
  }, [data])

  const maxAbs = useMemo(() => {
    if (!data?.data) return 0.2
    let max = 0.05
    for (const r of data.data) {
      if (r.weekly_change != null && Math.abs(r.weekly_change) > max) {
        max = Math.abs(r.weekly_change)
      }
    }
    return Math.min(max, 0.5)
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">수도권 지도</h1>
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

      {data?.survey_date && (
        <p className="text-sm text-muted-foreground">기준일: {data.survey_date}</p>
      )}
      <ColorBar maxAbs={maxAbs} />

      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* 서울 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">서울 ({metroRegions.seoul.length}개 구)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-[3px]">
                {metroRegions.seoul.map(r => (
                  <RegionTile key={r.region_code} r={r} maxAbs={maxAbs} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 경기 */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">경기 ({metroRegions.gyeonggi.length}개 시군)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-[3px]">
                {metroRegions.gyeonggi.map(r => (
                  <RegionTile key={r.region_code} r={r} maxAbs={maxAbs} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 인천 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">인천 ({metroRegions.incheon.length}개 구군)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-[3px]">
                {metroRegions.incheon.map(r => (
                  <RegionTile key={r.region_code} r={r} maxAbs={maxAbs} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
