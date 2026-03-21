import ReactApexChart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

interface Item {
  name: string
  value: number
}

interface HorizontalBarRankProps {
  items: Item[]
  title?: string
  height?: number
  positiveColor?: string
  negativeColor?: string
}

export function HorizontalBarRank({
  items, title, height, positiveColor = '#ef4444', negativeColor = '#3b82f6',
}: HorizontalBarRankProps) {
  const categories = items.map(i => i.name)
  const data = items.map(i => i.value)
  const colors = items.map(i => i.value >= 0 ? positiveColor : negativeColor)

  const calcHeight = height ?? Math.max(200, items.length * 32 + 40)

  const options: ApexOptions = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 3,
        barHeight: '65%',
        distributed: true,
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (v: number) => (v >= 0 ? '+' : '') + v.toFixed(3),
      offsetX: 30,
      style: { fontSize: '11px', colors: ['#d1d5db'] },
    },
    theme: { mode: 'dark' },
    xaxis: {
      categories,
      labels: { style: { colors: '#9ca3af' }, formatter: (v) => Number(v).toFixed(3) },
    },
    yaxis: {
      labels: { style: { colors: '#d1d5db', fontSize: '12px' } },
    },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { show: false },
    colors,
    title: title ? {
      text: title,
      style: { color: '#e5e7eb', fontSize: '13px', fontWeight: '600' },
    } : undefined,
    tooltip: {
      y: { formatter: (v) => (v >= 0 ? '+' : '') + v.toFixed(4) + '%' },
    },
  }

  return (
    <ReactApexChart
      options={options}
      series={[{ name: '변동률', data }]}
      type="bar"
      height={calcHeight}
    />
  )
}
