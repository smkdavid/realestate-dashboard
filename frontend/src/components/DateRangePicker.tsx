import { cn } from '@/lib/utils'
import { Select } from './ui/select'

export interface DateRange {
  startDate: string
  endDate: string
}

const PRESET_OPTIONS = [
  { value: '26w', label: '6개월' },
  { value: '52w', label: '1년' },
  { value: '156w', label: '3년' },
  { value: '260w', label: '5년' },
  { value: 'custom', label: '사용자 지정' },
]

interface DateRangePickerProps {
  preset: string
  onPresetChange: (v: string) => void
  startDate: string
  endDate: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  className?: string
}

export function DateRangePicker({
  preset, onPresetChange, startDate, endDate, onStartChange, onEndChange, className
}: DateRangePickerProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={preset} onChange={e => onPresetChange(e.target.value)} options={PRESET_OPTIONS} />
      {preset === 'custom' && (
        <>
          <input
            type="date"
            value={startDate}
            onChange={e => onStartChange(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm
              focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <input
            type="date"
            value={endDate}
            onChange={e => onEndChange(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm
              focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </>
      )}
    </div>
  )
}

/** preset 문자열 → { days } 또는 { startDate, endDate } 변환 */
export function presetToParams(preset: string, startDate: string, endDate: string) {
  if (preset === 'custom' && startDate && endDate) {
    return { start_date: startDate, end_date: endDate, days: undefined }
  }
  const weeks = parseInt(preset)
  return { days: weeks * 7, start_date: undefined, end_date: undefined }
}
