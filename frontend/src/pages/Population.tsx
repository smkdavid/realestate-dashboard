import { KPICard } from '@/components/KPICard'
import { LineChart } from '@/components/charts/LineChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useEconomy } from '@/hooks/useApi'
import { fmt2 } from '@/lib/utils'

function PopChart({ indicator, title, color, unit }: {
  indicator: string; title: string; color: string; unit?: string
}) {
  const { data, isLoading } = useEconomy(indicator, 40)
  const series = data
    ? [{ name: title, data: data.map((d: any) => [d.stat_date, d.value] as [string, number]) }]
    : []
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : (
          <LineChart series={series} height={240} colors={[color]}
            yFormatter={v => unit ? v.toFixed(1) + unit : v.toLocaleString()} />
        )}
      </CardContent>
    </Card>
  )
}

export default function Population() {
  const { data: latest } = useEconomy('population', 1)
  const pop = latest?.at(-1)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">인구 / 소득</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard title="총인구" value={pop ? (pop.value / 10000).toFixed(0) : '-'} unit="만명" />
        <KPICard title="데이터 수집 경로" value="통계청 KOSIS" subLabel="인구/가구/소득" />
        <KPICard title="업데이트 주기" value="연간" />
        <KPICard title="매일 10시" value="자동 갱신" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PopChart indicator="population" title="총인구 추이" color="#60a5fa" />
        <PopChart indicator="household_income" title="가구 소득 추이" color="#34d399" unit="만원" />
        <PopChart indicator="household_debt" title="가계부채 추이" color="#f87171" />
        <PopChart indicator="hai" title="주택구입부담지수 (HAI)" color="#fbbf24" />
      </div>
    </div>
  )
}
