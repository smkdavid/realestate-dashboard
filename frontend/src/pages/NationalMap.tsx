import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useKbSnapshot, useKbAvailableDates } from '@/hooks/useApi'
import { heatColorDark } from '@/lib/utils'

type PriceType = 'buy' | 'rent'

// Group regions by province/city prefix
const GROUPS: { prefix: string; label: string }[] = [
  { prefix: '11', label: '서울' },
  { prefix: '26', label: '부산' },
  { prefix: '27', label: '대구' },
  { prefix: '23', label: '인천' },
  { prefix: '29', label: '광주' },
  { prefix: '30', label: '대전' },
  { prefix: '31', label: '울산' },
  { prefix: '36', label: '세종' },
  { prefix: '41', label: '경기' },
  { prefix: '42', label: '강원' },
  { prefix: '43', label: '충북' },
  { prefix: '44', label: '충남' },
  { prefix: '45', label: '전북' },
  { prefix: '46', label: '전남' },
  { prefix: '47', label: '경북' },
  { prefix: '48', label: '경남' },
  { prefix: '50', label: '제주' },
]

interface RegionCell {
  region_code: string
  region_name: string
  weekly_change: number | null
}

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

function RegionTile({ r, maxAbs }: { r: RegionCell; maxAbs: number }) {
  const bg = heatColorDark(r.weekly_change, maxAbs)
  const bright = r.weekly_change != null && Math.abs(r.weekly_change) > maxAbs * 0.5
  const color = bright ? '#fff' : '#d1d5db'

  return (
    <div
      className="flex flex-col items-center justify-center rounded p-0.5 min-w-[62px] h-[40px]"
      style={{ background: bg }}
      title={`${r.region_name}: ${r.weekly_change != null ? r.weekly_change.toFixed(4) : 'N/A'}`}
    >
      <span className="text-[9px] font-medium leading-tight" style={{ color }}>
        {r.region_name.length > 5 ? r.region_name.slice(0, 5) : r.region_name}
      </span>
      <span className="text-[8px] font-mono leading-tight" style={{ color }}>
        {r.weekly_change != null
          ? (r.weekly_change >= 0 ? '+' : '') + r.weekly_change.toFixed(3)
          : '-'}
      </span>
    </div>
  )
}

export default function NationalMap() {
  const [priceType, setPriceType] = useState<PriceType>('buy')
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const { data: dates } = useKbAvailableDates(priceType)
  const { data, isLoading } = useKbSnapshot(priceType, selectedDate)

  const grouped = useMemo(() => {
    if (!data?.data) return []
    const all = data.data as RegionCell[]
    return GROUPS.map(g => ({
      ...g,
      regions: all.filter(r => r.region_code.startsWith(g.prefix)),
    })).filter(g => g.regions.length > 0)
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
        <h1 className="text-xl font-bold">전국 지도</h1>
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
        <div className="space-y-3">
          {grouped.map(g => (
            <Card key={g.prefix}>
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm">{g.label} ({g.regions.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-[3px]">
                  {g.regions.map(r => (
                    <RegionTile key={r.region_code} r={r} maxAbs={maxAbs} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
