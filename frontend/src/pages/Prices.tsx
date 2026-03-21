import { useState } from 'react'
import { RegionSelector } from '@/components/RegionSelector'
import { KPICard } from '@/components/KPICard'
import { LineChart } from '@/components/charts/LineChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useKbPriceIndex, useKbSentiment } from '@/hooks/useApi'
import { fmt2, fmtSigned, fmtDate } from '@/lib/utils'
import { DateRangePicker } from '@/components/DateRangePicker'

const SOURCE_KB = 'KB국민은행 리브온 (주간)'

export default function Prices() {
  const [region, setRegion] = useState('0000')
  const [preset, setPreset] = useState('260')
  const [startDate, setStartDate] = useState('2022-01-01')
  const [endDate, setEndDate] = useState('2023-07-10')

  const range = preset === 'custom' && startDate && endDate
    ? { startDate, endDate }
    : undefined
  const weeks = preset === 'custom' ? 200 : parseInt(preset)

  const { data: buyData, isLoading: loadBuy } = useKbPriceIndex(region, 'buy', weeks, range)
  const { data: rentData, isLoading: loadRent } = useKbPriceIndex(region, 'rent', weeks, range)
  const { data: sentData } = useKbSentiment(region, weeks, range)

  const latestBuy = buyData?.at(-1)
  const latestRent = rentData?.at(-1)

  const buySeries = buyData
    ? [{ name: '매매지수', data: buyData.map((d: any) => [d.date, d.value] as [string, number]) }]
    : []
  const rentSeries = rentData
    ? [{ name: '전세지수', data: rentData.map((d: any) => [d.date, d.value] as [string, number]) }]
    : []
  const combinedSeries = [...buySeries, ...rentSeries]

  const ratioSeries = buyData && rentData
    ? [{
        name: '전세가율(%)',
        data: buyData.map((b: any, i: number) => {
          const r = rentData[i]
          return [b.date, r ? (r.value / b.value) * 100 : 0] as [string, number]
        }),
      }]
    : []

  const sentSeries = sentData
    ? [
        { name: '매수우위지수', data: sentData.map((d: any) => [d.date, d.buyer_seller] as [string, number]) },
        { name: '전세수급지수', data: sentData.filter((d: any) => d.jeonse_supply != null).map((d: any) => [d.date, d.jeonse_supply] as [string, number]) },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-xl font-bold">가격 / 심리 분석</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <RegionSelector value={region} onChange={setRegion} />
          <DateRangePicker
            preset={preset}
            onPresetChange={setPreset}
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard
          title="매매지수"
          value={latestBuy ? fmt2(latestBuy.value) : '-'}
          change={latestBuy?.change}
          subLabel={`기준: ${fmtDate(latestBuy?.date)}`}
          info="KB국민은행이 주간 조사하는 아파트 매매가격지수. 2022년 1월=100 기준. 100 이상이면 기준 시점 대비 가격 상승."
        />
        <KPICard
          title="전세지수"
          value={latestRent ? fmt2(latestRent.value) : '-'}
          change={latestRent?.change}
          info="KB국민은행이 주간 조사하는 아파트 전세가격지수. 2022년 1월=100 기준."
        />
        <KPICard
          title="주간 매매변동"
          value={latestBuy ? fmtSigned(latestBuy.change) : '-'}
          unit="%"
          valueClassName={latestBuy?.change >= 0 ? 'text-red-400' : 'text-blue-400'}
          info="직전 주 대비 매매가격지수 변화율(%). 양수=상승(빨강), 음수=하락(파랑)."
        />
        <KPICard
          title="주간 전세변동"
          value={latestRent ? fmtSigned(latestRent.change) : '-'}
          unit="%"
          valueClassName={latestRent?.change >= 0 ? 'text-red-400' : 'text-blue-400'}
          info="직전 주 대비 전세가격지수 변화율(%). 양수=상승(빨강), 음수=하락(파랑)."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>매매 · 전세지수 비교</CardTitle></CardHeader>
          <CardContent>
            {loadBuy || loadRent ? <Spinner /> : (
              <LineChart series={combinedSeries} height={280} colors={['#60a5fa', '#f87171']} source={SOURCE_KB} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              전세가율 추이 (%)
              <span className="ml-2 text-xs font-normal text-muted-foreground">매매가 대비 전세가 — 70% 이상이면 전세 수요 강세</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart series={ratioSeries} height={280} colors={['#f59e0b']}
              yFormatter={v => v.toFixed(1) + '%'} source={SOURCE_KB} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              매수우위 · 전세수급지수
              <span className="ml-2 text-xs font-normal text-muted-foreground">100 기준 — 이상이면 수요 우위, 미만이면 공급 우위</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart series={sentSeries} height={280}
              colors={['#f87171', '#34d399']} referenceLine={100} source={SOURCE_KB} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>주간 매매 증감률 (%)</CardTitle></CardHeader>
          <CardContent>
            {buyData ? (
              <LineChart
                series={[{ name: '주간변동', data: buyData.map((d: any) => [d.date, d.change] as [string, number]) }]}
                height={280}
                colors={['#a78bfa']}
                yFormatter={v => v.toFixed(2) + '%'}
                referenceLine={0}
                source={SOURCE_KB}
              />
            ) : <Spinner />}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        ※ KB 데이터는 로컬 xlsx 파일 기준 (마지막 데이터: {fmtDate(latestBuy?.date ?? latestRent?.date) || '-'}).
        최신 데이터는 관리자 페이지에서 새 xlsx 파일을 업로드하세요.
      </p>
    </div>
  )
}
