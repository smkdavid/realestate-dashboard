import ReactApexChart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

interface BarChartProps {
  categories: string[]
  series: { name: string; data: number[] }[]
  height?: number
  colors?: string[]
  stacked?: boolean
  horizontal?: boolean
  yFormatter?: (v: number) => string
  source?: string
}

export function BarChart({
  categories, series, height = 300, colors, stacked = false, horizontal = false, yFormatter, source
}: BarChartProps) {
  const options: ApexOptions = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, stacked },
    plotOptions: { bar: { horizontal, borderRadius: 3, columnWidth: '60%' } },
    theme: { mode: 'dark' },
    xaxis: { categories, labels: { style: { colors: '#9ca3af' } } },
    yaxis: { labels: { style: { colors: '#9ca3af' }, formatter: yFormatter ?? ((v) => v.toFixed(0)) } },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { labels: { colors: '#d1d5db' } },
    colors: colors ?? ['#60a5fa', '#f87171', '#34d399', '#fbbf24'],
  }
  return (
    <div className="relative">
      <ReactApexChart options={options} series={series} type="bar" height={height} />
      {source && (
        <p className="text-right text-[10px] text-muted-foreground -mt-2 pr-1 pb-1">
          출처: {source}
        </p>
      )}
    </div>
  )
}
