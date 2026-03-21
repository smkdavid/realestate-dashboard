import ReactApexChart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

export interface DualSeries {
  name: string
  data: { x: number; y: number | null }[]
  type?: 'line' | 'area'
}

interface DualAxisChartProps {
  leftSeries: DualSeries[]
  rightSeries: DualSeries[]
  leftLabel?: string
  rightLabel?: string
  height?: number
  leftColors?: string[]
  rightColors?: string[]
  referenceLine?: number
  source?: string
}

export function DualAxisChart({
  leftSeries, rightSeries, leftLabel, rightLabel,
  height = 260, leftColors, rightColors, referenceLine, source,
}: DualAxisChartProps) {
  const allColors = [
    ...(leftColors ?? ['#f87171', '#fb923c']),
    ...(rightColors ?? ['#60a5fa', '#34d399']),
  ]

  const series = [
    ...leftSeries.map(s => ({ name: s.name, data: s.data, type: s.type ?? 'line' as const })),
    ...rightSeries.map(s => ({ name: s.name, data: s.data, type: s.type ?? 'line' as const })),
  ]

  const annotations: ApexOptions['annotations'] = referenceLine != null ? {
    yaxis: [{
      y: referenceLine,
      borderColor: '#6b7280',
      strokeDashArray: 4,
      label: {
        text: `${referenceLine}`,
        style: { color: '#9ca3af', background: 'transparent', fontSize: '11px' },
      },
    }],
  } : {}

  const options: ApexOptions = {
    chart: {
      background: 'transparent',
      toolbar: { show: true, tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true } },
      zoom: { enabled: true },
    },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: leftSeries.concat(rightSeries).map(() => 2) },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9ca3af' }, datetimeUTC: false },
    },
    yaxis: [
      {
        title: { text: leftLabel, style: { color: '#9ca3af', fontSize: '11px' } },
        labels: { style: { colors: '#9ca3af' }, formatter: (v) => v?.toFixed(1) ?? '' },
      },
      {
        opposite: true,
        title: { text: rightLabel, style: { color: '#9ca3af', fontSize: '11px' } },
        labels: { style: { colors: '#9ca3af' }, formatter: (v) => v?.toFixed(1) ?? '' },
      },
    ],
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { labels: { colors: '#d1d5db' }, position: 'top', fontSize: '11px' },
    tooltip: { x: { format: 'yyyy-MM-dd' } },
    colors: allColors,
    annotations,
  }

  // Assign yAxisIndex: left series → 0, right series → 1
  const apexSeries = series.map((s, i) => ({
    name: s.name,
    type: s.type ?? ('line' as const),
    data: s.data,
  }))

  // yaxis mapping via chart options
  const yaxisMapping = [
    ...leftSeries.map(() => 0),
    ...rightSeries.map(() => 1),
  ]

  // ApexCharts doesn't directly support yAxisIndex on series,
  // so we use yaxis array where each yaxis maps to series by index
  const fullYaxis = yaxisMapping.map((idx) => ({
    ...(idx === 0 ? (options.yaxis as any[])[0] : (options.yaxis as any[])[1]),
    show: idx === 0 ? yaxisMapping.indexOf(0) === yaxisMapping.lastIndexOf(0) || true : yaxisMapping.indexOf(1) === yaxisMapping.lastIndexOf(1) || true,
    seriesName: undefined,
  }))

  // simpler approach: just set show on first of each group
  const finalYaxis = yaxisMapping.map((idx, i) => {
    const base = idx === 0 ? (options.yaxis as any[])[0] : (options.yaxis as any[])[1]
    const firstOfGroup = yaxisMapping.indexOf(idx)
    return { ...base, show: i === firstOfGroup }
  })

  const finalOptions: ApexOptions = { ...options, yaxis: finalYaxis }

  return (
    <div className="relative">
      <ReactApexChart
        options={finalOptions}
        series={apexSeries}
        type="line"
        height={height}
      />
      {source && (
        <p className="text-right text-[10px] text-muted-foreground -mt-2 pr-1 pb-1">
          출처: {source}
        </p>
      )}
    </div>
  )
}
