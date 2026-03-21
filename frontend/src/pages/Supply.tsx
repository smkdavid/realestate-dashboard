import { useState } from 'react'
import { KPICard } from '@/components/KPICard'
import { BarChart } from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { RegionSelector } from '@/components/RegionSelector'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fmt2 } from '@/lib/utils'

function useSupply(region: string, data_type: string, limit = 24) {
  return useQuery({
    queryKey: ['supply', region, data_type],
    queryFn: () => api.get('/supply', { params: { region_code: region, data_type, limit } }).then(r => r.data),
  })
}

export default function Supply() {
  const [region, setRegion] = useState('0000')

  const { data: unsoldData, isLoading: loadUnsold } = useSupply(region, 'unsold', 24)
  const { data: permitData } = useSupply(region, 'permit', 24)
  const { data: tradeData } = useSupply(region, 'trade', 24)
  const { data: movinData } = useSupply(region, 'scheduled_movein', 12)

  const latestUnsold = unsoldData?.at(-1)
  const latestTrade = tradeData?.at(-1)

  const unsoldChart = unsoldData ? {
    categories: unsoldData.map((d: any) => d.year_month),
    series: [{ name: '미분양(호)', data: unsoldData.map((d: any) => d.value) }],
  } : null

  const permitSeries = permitData
    ? [{ name: '인허가', data: permitData.map((d: any) => [d.year_month + '-01', d.value] as [string, number]) }]
    : []

  const tradeSeries = tradeData
    ? [{ name: '거래량', data: tradeData.map((d: any) => [d.year_month + '-01', d.value] as [string, number]) }]
    : []

  const movinChart = movinData ? {
    categories: movinData.map((d: any) => d.year_month),
    series: [{ name: '입주예정(세대)', data: movinData.map((d: any) => d.value) }],
  } : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">공급 / 거래</h1>
        <RegionSelector value={region} onChange={setRegion} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard title="미분양(최근)" value={latestUnsold ? latestUnsold.value.toLocaleString() : '-'} unit="호" />
        <KPICard title="거래량(최근)" value={latestTrade ? latestTrade.value.toLocaleString() : '-'} unit="건" />
        <KPICard title="인허가(최근)" value={permitData?.at(-1) ? permitData.at(-1).value.toLocaleString() : '-'} unit="세대" />
        <KPICard title="입주예정(최근)" value={movinData?.at(-1) ? movinData.at(-1).value.toLocaleString() : '-'} unit="세대" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>미분양 추이 (24개월)</CardTitle></CardHeader>
          <CardContent>
            {loadUnsold ? <Spinner /> : unsoldChart && (
              <BarChart categories={unsoldChart.categories} series={unsoldChart.series}
                height={260} colors={['#f87171']} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>입주예정 공급량 (12개월)</CardTitle></CardHeader>
          <CardContent>
            {movinChart && (
              <BarChart categories={movinChart.categories} series={movinChart.series}
                height={260} colors={['#60a5fa']} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>인허가 추이 (24개월, 선행지표)</CardTitle></CardHeader>
          <CardContent>
            <LineChart series={permitSeries} height={260} colors={['#34d399']}
              yFormatter={v => v.toLocaleString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>아파트 거래량 추이 (24개월)</CardTitle></CardHeader>
          <CardContent>
            <LineChart series={tradeSeries} height={260} colors={['#a78bfa']}
              yFormatter={v => v.toLocaleString()} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
