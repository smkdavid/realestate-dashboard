import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useKbHeatmap } from '@/hooks/useApi'
import { heatColorDark } from '@/lib/utils'

type PriceType = 'buy' | 'rent'

const CELL_W = 52
const CELL_H = 28
const HEADER_H = 80
const DATE_COL_W = 90

function ColorBar() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>하락</span>
      <div className="flex h-4">
        {Array.from({ length: 20 }, (_, i) => {
          const val = -0.5 + (i / 19) * 1.0
          return <div key={i} className="w-3 h-4" style={{ background: heatColorDark(val, 0.3) }} />
        })}
      </div>
      <span>상승</span>
    </div>
  )
}

export default function Heatmap() {
  const [priceType, setPriceType] = useState<PriceType>('buy')
  const [months, setMonths] = useState(12)

  const startDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - months)
    return d.toISOString().slice(0, 10)
  }, [months])
  const endDate = new Date().toISOString().slice(0, 10)

  const { data, isLoading } = useKbHeatmap(priceType, startDate, endDate)

  const dates: string[] = data?.dates || []
  const regionCodes: string[] = data?.region_codes || []
  const regionNames: Record<string, string> = data?.region_names || {}
  const dataMap = useMemo(() => {
    const m: Record<string, Record<string, number | null>> = {}
    for (const row of (data?.data || [])) {
      m[row.date] = row.values
    }
    return m
  }, [data])

  const rowCount = dates.length
  const colCount = regionCodes.length

  // Compute maxAbs for color scaling
  const maxAbs = useMemo(() => {
    let max = 0.1
    for (const d of dates) {
      const vals = dataMap[d]
      if (!vals) continue
      for (const code of regionCodes) {
        const v = vals[code]
        if (v != null && Math.abs(v) > max) max = Math.abs(v)
      }
    }
    return Math.min(max, 0.5)
  }, [dates, regionCodes, dataMap])

  const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 280 : 1200
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 300 : 600

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {priceType === 'buy' ? '매매' : '전세'}지수 증감 히트맵
        </h1>
        <div className="flex items-center gap-2">
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
          <select
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            className="rounded bg-card border border-border px-3 py-1.5 text-sm"
          >
            <option value={6}>6개월</option>
            <option value={12}>1년</option>
            <option value={24}>2년</option>
            <option value={60}>5년</option>
          </select>
        </div>
      </div>

      <ColorBar />

      {isLoading ? <Spinner /> : (
        <div className="relative overflow-hidden rounded border border-border bg-card">
          {/* Column headers (region names) */}
          <div className="flex" style={{ height: HEADER_H }}>
            <div className="shrink-0 flex items-end pb-1 px-2 text-xs text-muted-foreground font-medium border-r border-border bg-card z-10"
              style={{ width: DATE_COL_W, position: 'sticky', left: 0 }}>
              날짜
            </div>
            <div className="overflow-hidden" id="header-scroll">
              <div className="flex" style={{ width: colCount * CELL_W }}>
                {regionCodes.map(code => (
                  <div key={code}
                    className="shrink-0 flex items-end justify-center pb-1 text-[10px] text-muted-foreground border-r border-border"
                    style={{ width: CELL_W, height: HEADER_H }}
                  >
                    <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                      {regionNames[code]?.slice(0, 6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data grid */}
          <div className="flex">
            {/* Sticky date column */}
            <div className="shrink-0 overflow-hidden bg-card z-10 border-r border-border"
              style={{ width: DATE_COL_W }}
              id="date-col">
              {dates.map(d => (
                <div key={d}
                  className="flex items-center px-2 text-xs text-muted-foreground border-b border-border/50"
                  style={{ height: CELL_H }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Virtualized grid */}
            <div style={{ width: containerWidth - DATE_COL_W, height: Math.min(rowCount * CELL_H, containerHeight) }}
              className="overflow-auto"
              onScroll={(e) => {
                const target = e.currentTarget
                // Sync header scroll
                const headerEl = document.getElementById('header-scroll')
                if (headerEl) headerEl.scrollLeft = target.scrollLeft
                // Sync date column scroll
                const dateCol = document.getElementById('date-col')
                if (dateCol) dateCol.scrollTop = target.scrollTop
              }}
            >
              <div style={{ width: colCount * CELL_W, height: rowCount * CELL_H, position: 'relative' }}>
                {dates.map((dateStr, rowIdx) => (
                  <div key={dateStr} className="flex" style={{ height: CELL_H }}>
                    {regionCodes.map((code, colIdx) => {
                      const val = dataMap[dateStr]?.[code]
                      return (
                        <div
                          key={code}
                          className="shrink-0 flex items-center justify-center text-[10px] font-mono border-r border-b"
                          style={{
                            width: CELL_W,
                            height: CELL_H,
                            background: heatColorDark(val, maxAbs),
                            borderColor: '#1a1a2e',
                            color: val != null ? (Math.abs(val) > maxAbs * 0.6 ? '#fff' : '#d1d5db') : '#4b5563',
                          }}
                          title={`${regionNames[code]} ${dateStr}: ${val != null ? val.toFixed(4) : 'N/A'}`}
                        >
                          {val != null ? (val >= 0 ? '+' : '') + val.toFixed(3) : ''}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
