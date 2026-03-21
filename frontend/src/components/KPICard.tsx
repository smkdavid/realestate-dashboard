import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { cn, fmtSigned, changeColor } from '@/lib/utils'
import { InfoTooltip } from './InfoTooltip'

interface KPICardProps {
  title: string
  value: string | number
  change?: number | null
  unit?: string
  subLabel?: string
  className?: string
  valueClassName?: string
  info?: string
}

export function KPICard({ title, value, change, unit, subLabel, className, valueClassName, info }: KPICardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {title}
          {info && <InfoTooltip text={info} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueClassName)}>
          {value}{unit && <span className="text-base font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {change != null && (
          <div className={cn('mt-1 text-sm font-medium', changeColor(change))}>
            {fmtSigned(change)}%
          </div>
        )}
        {subLabel && <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>}
      </CardContent>
    </Card>
  )
}
