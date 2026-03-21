import { heatColorDark } from '@/lib/utils'

export interface GridRegion {
  code: string
  name: string
  row: number
  col: number
  value: number | null
}

interface RegionGridMapProps {
  regions: GridRegion[]
  maxAbs?: number
  title?: string
}

export function RegionGridMap({ regions, maxAbs = 0.3, title }: RegionGridMapProps) {
  if (regions.length === 0) return null

  const maxRow = Math.max(...regions.map(r => r.row))
  const maxCol = Math.max(...regions.map(r => r.col))

  // Build grid lookup
  const grid: Record<string, GridRegion> = {}
  for (const r of regions) {
    grid[`${r.row}-${r.col}`] = r
  }

  return (
    <div className="overflow-auto">
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <div
        className="inline-grid gap-[2px]"
        style={{
          gridTemplateRows: `repeat(${maxRow}, 44px)`,
          gridTemplateColumns: `repeat(${maxCol}, 72px)`,
        }}
      >
        {Array.from({ length: maxRow * maxCol }, (_, i) => {
          const row = Math.floor(i / maxCol) + 1
          const col = (i % maxCol) + 1
          const region = grid[`${row}-${col}`]

          if (!region) {
            return <div key={i} />
          }

          const bg = heatColorDark(region.value, maxAbs)
          const textColor = region.value != null && Math.abs(region.value) > maxAbs * 0.5 ? '#fff' : '#d1d5db'

          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded text-center cursor-default"
              style={{ background: bg, gridRow: row, gridColumn: col }}
              title={`${region.name}: ${region.value != null ? (region.value >= 0 ? '+' : '') + region.value.toFixed(4) : 'N/A'}`}
            >
              <span className="text-[10px] leading-tight font-medium" style={{ color: textColor }}>
                {region.name.length > 4 ? region.name.slice(0, 4) : region.name}
              </span>
              <span className="text-[9px] font-mono leading-tight" style={{ color: textColor }}>
                {region.value != null
                  ? (region.value >= 0 ? '+' : '') + region.value.toFixed(3)
                  : '-'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
