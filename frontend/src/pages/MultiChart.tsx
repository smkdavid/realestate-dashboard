import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { DualAxisChart, DualSeries } from '@/components/charts/DualAxisChart'
import { useKbPriceIndex, useKbSentiment, useKbPriceRegions } from '@/hooks/useApi'
import { SearchableRegionSelector } from '@/components/SearchableRegionSelector'

const DEFAULT_REGIONS = [
  { code: '11000', name: '서울' },
  { code: '41000', name: '경기' },
  { code: '30000', name: '대전' },
  { code: '29000', name: '광주' },
  { code: '26000', name: '부산' },
]

// 심리지수 region code mapping (sentiment uses shorter codes)
const SENTIMENT_CODE_MAP: Record<string, string> = {
  '11000': '1100', '41000': '4100', '26000': '2600', '27000': '2700',
  '29000': '2900', '30000': '3000', '31000': '3100', '36000': '3600',
  '23000': '2300', '42000': '4200', '43000': '4300', '44000': '4400',
  '45000': '4500', '46000': '4600', '47000': '4700', '48000': '4800',
  '50000': '5000',
}

function toTimestamp(d: string) { return new Date(d).getTime() }

interface PanelProps {
  regionCode: string
  regionName: string
  weeks: number
  onRegionChange: (code: string, name: string) => void
}

function ChartPanel({ regionCode, regionName, weeks, onRegionChange }: PanelProps) {
  const sentimentCode = SENTIMENT_CODE_MAP[regionCode] || regionCode
  const { data: buyData, isLoading: lb } = useKbPriceIndex(regionCode, 'buy', weeks)
  const { data: rentData, isLoading: lr } = useKbPriceIndex(regionCode, 'rent', weeks)
  const { data: sentData, isLoading: ls } = useKbSentiment(sentimentCode, weeks)

  const isLoading = lb || lr || ls

  // 매매심리 & 매매지수
  const buyIndexSeries: DualSeries = {
    name: '매매지수',
    data: (buyData || []).map((d: any) => ({ x: toTimestamp(d.date), y: d.value })),
  }
  const buyerSellerSeries: DualSeries = {
    name: '매수우위지수',
    data: (sentData || []).map((d: any) => ({ x: toTimestamp(d.date), y: d.buyer_seller })),
  }

  // 전세심리 & 전세지수
  const rentIndexSeries: DualSeries = {
    name: '전세지수',
    data: (rentData || []).map((d: any) => ({ x: toTimestamp(d.date), y: d.value })),
  }
  const jeonseSupplySeries: DualSeries = {
    name: '전세수급지수',
    data: (sentData || []).map((d: any) => ({ x: toTimestamp(d.date), y: d.jeonse_supply })),
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{regionName}</CardTitle>
          <SearchableRegionSelector
            value={regionCode}
            onChange={(code) => {
              onRegionChange(code, '')
            }}
            type="price"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <Spinner /> : (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">매수우위지수 & 매매지수</p>
              <DualAxisChart
                leftSeries={[buyerSellerSeries]}
                rightSeries={[buyIndexSeries]}
                leftLabel="매수우위지수"
                rightLabel="매매지수"
                height={200}
                leftColors={['#f87171']}
                rightColors={['#60a5fa']}
                referenceLine={100}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">전세수급지수 & 전세지수</p>
              <DualAxisChart
                leftSeries={[jeonseSupplySeries]}
                rightSeries={[rentIndexSeries]}
                leftLabel="전세수급지수"
                rightLabel="전세지수"
                height={200}
                leftColors={['#fb923c']}
                rightColors={['#34d399']}
                referenceLine={100}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function MultiChart() {
  const [mode, setMode] = useState<'long' | 'short'>('long')
  const weeks = mode === 'long' ? 260 : 104
  const [regions, setRegions] = useState(DEFAULT_REGIONS)

  const handleRegionChange = (index: number, code: string, name: string) => {
    setRegions(prev => {
      const next = [...prev]
      next[index] = { code, name: name || code }
      return next
    })
  }

  const addPanel = () => {
    setRegions(prev => [...prev, { code: '11000', name: '서울' }])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">다중 비교 차트</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('long')}
            className={`px-3 py-1.5 text-sm rounded ${mode === 'long' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}
          >
            장기 (5년)
          </button>
          <button
            onClick={() => setMode('short')}
            className={`px-3 py-1.5 text-sm rounded ${mode === 'short' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}
          >
            단기 (2년)
          </button>
          <button
            onClick={addPanel}
            className="px-3 py-1.5 text-sm rounded bg-card border border-border hover:bg-accent"
          >
            + 패널 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {regions.map((r, i) => (
          <ChartPanel
            key={`${r.code}-${i}`}
            regionCode={r.code}
            regionName={r.name}
            weeks={weeks}
            onRegionChange={(code, name) => handleRegionChange(i, code, name)}
          />
        ))}
      </div>
    </div>
  )
}
