import ReactApexChart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'
import { livingIndexColor } from '@/lib/utils'

interface GaugeChartProps {
  value: number
  max?: number
  label?: string
  height?: number
}

export function GaugeChart({ value, max = 200, label, height = 200 }: GaugeChartProps) {
  const pct = Math.min((value / max) * 100, 100)
  const color = value <= 100 ? '#60a5fa' : '#f59e0b'

  const options: ApexOptions = {
    chart: { type: 'radialBar', background: 'transparent' },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow: { size: '60%' },
        track: { background: '#374151' },
        dataLabels: {
          name: { show: !!label, offsetY: -8, color: '#9ca3af', fontSize: '12px' },
          value: { color: '#f3f4f6', fontSize: '22px', fontWeight: '700',
            formatter: () => value.toFixed(1) },
        },
      },
    },
    fill: { colors: [color] },
    labels: label ? [label] : [''],
    theme: { mode: 'dark' },
  }

  return <ReactApexChart options={options} series={[pct]} type="radialBar" height={height} />
}
