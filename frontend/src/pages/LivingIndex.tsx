import { useState } from 'react'
import { RegionSelector } from '@/components/RegionSelector'
import { KPICard } from '@/components/KPICard'
import { LineChart } from '@/components/charts/LineChart'
import { GaugeChart } from '@/components/charts/GaugeChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useLivingIndex, useLivingIndexLatest, useEconomy } from '@/hooks/useApi'
import { fmt2, fmtDate, REGION_NAMES } from '@/lib/utils'

export default function LivingIndex() {
  const [region, setRegion] = useState('0000')

  const { data: series, isLoading } = useLivingIndex(region, 52)
  const { data: latest } = useLivingIndexLatest()
  const { data: rateData } = useEconomy('mortgage_rate', 52)

  const current = series?.at(-1)

  const livingChart = series
    ? [{ name: '실거주지수', data: series.map((d: any) => [d.date, d.living_index] as [string, number]) }]
    : []
  const ratioChart = series
    ? [{ name: '전세가율(%)', data: series.map((d: any) => [d.date, d.jeonse_ratio * 100] as [string, number]) }]
    : []
  const rateChart = rateData
    ? [{ name: '주담대금리(%)', data: rateData.map((d: any) => [d.date, d.value] as [string, number]) }]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">실거주지수 ⭐</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            (전세월비용 / 매수월비용) × 100 — 100 이하: 매수유리, 100 초과: 전세유리
          </p>
        </div>
        <RegionSelector value={region} onChange={setRegion} />
      </div>

      {current && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center py-4">
            <GaugeChart value={current.living_index} max={200} label="실거주지수" height={220} />
            <p className="text-sm font-medium mt-1">
              {REGION_NAMES[region]} — {current.living_index <= 100
                ? <span className="text-blue-400">매수 유리</span>
                : <span className="text-amber-400">전세 유리</span>}
            </p>
          </Card>
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <KPICard title="실거주지수" value={fmt2(current.living_index)}
              subLabel={current.living_index <= 100 ? '매수 유리 구간' : '전세 유리 구간'}
              valueClassName={current.living_index <= 100 ? 'text-blue-400' : 'text-amber-400'} />
            <KPICard title="전세가율" value={fmt2(current.jeonse_ratio * 100)} unit="%" />
            <KPICard title="주담대금리" value={fmt2(current.mortgage_rate)} unit="%" />
            <KPICard title="전월세전환율" value={fmt2(current.conversion_rate)} unit="%" />
            <KPICard title="매수월비용" value={fmt2(current.buy_index * (1 - current.jeonse_ratio) * current.mortgage_rate / 100 / 12)} unit="만원" />
            <KPICard title="전세월비용" value={fmt2(current.rent_index * current.jeonse_ratio * current.conversion_rate / 100 / 12)} unit="만원" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>실거주지수 추이 (1년)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Spinner /> : (
              <LineChart series={livingChart} height={260} referenceLine={100}
                colors={['#60a5fa']} yFormatter={(v) => v.toFixed(1)} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>전세가율 추이 (1년)</CardTitle></CardHeader>
          <CardContent>
            <LineChart series={ratioChart} height={260} colors={['#f59e0b']}
              yFormatter={(v) => v.toFixed(1) + '%'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>주택담보대출금리 추이</CardTitle></CardHeader>
          <CardContent>
            <LineChart series={rateChart} height={260} colors={['#f87171']}
              yFormatter={(v) => v.toFixed(2) + '%'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>전국 지역별 실거주지수 비교</CardTitle></CardHeader>
          <CardContent>
            {latest ? (
              <div className="space-y-2">
                {latest
                  .sort((a: any, b: any) => a.living_index - b.living_index)
                  .map((r: any) => (
                    <div key={r.region_code} className="flex items-center gap-3">
                      <span className="w-12 text-xs text-muted-foreground">{r.region_name}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${r.living_index <= 100 ? 'bg-blue-400' : 'bg-amber-400'}`}
                          style={{ width: `${Math.min(r.living_index / 2, 100)}%` }}
                        />
                      </div>
                      <span className={`w-14 text-right text-sm font-medium
                        ${r.living_index <= 100 ? 'text-blue-400' : 'text-amber-400'}`}>
                        {fmt2(r.living_index)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : <Spinner />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
