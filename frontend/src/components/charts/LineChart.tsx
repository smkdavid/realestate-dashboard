import ReactApexChart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

export interface ChartSeries {
  name: string
  data: [string, number][]
}

interface LineChartProps {
  series: ChartSeries[]
  height?: number
  yFormatter?: (v: number) => string
  colors?: string[]
  referenceLine?: number
  source?: string
}

export function LineChart({
  series, height = 300, yFormatter, colors, referenceLine, source
}: LineChartProps) {
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
      type: 'line',
      background: 'transparent',
      toolbar: {
        show: true,
        tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true },
      },
      zoom: { enabled: true },
    },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9ca3af' }, datetimeUTC: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#9ca3af' },
        formatter: yFormatter ?? ((v) => v.toFixed(1)),
      },
    },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { labels: { colors: '#d1d5db' } },
    tooltip: { x: { format: 'yyyy-MM-dd' } },
    colors: colors ?? ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa'],
    annotations,
  }

  // ApexCharts v4: [string, number][] 형식을 { x, y } 형식으로 변환
  const apexSeries = series.map(s => ({
    name: s.name,
    data: s.data.map(([x, y]) => ({ x: new Date(x).getTime(), y })),
  }))

  return (
    <div className="relative">
      <ReactApexChart
        options={options}
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
