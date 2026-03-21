import { REGIONS } from '@/lib/utils'
import { Select } from './ui/select'

interface RegionSelectorProps {
  value: string
  onChange: (code: string) => void
  className?: string
}

export function RegionSelector({ value, onChange, className }: RegionSelectorProps) {
  const options = REGIONS.map(r => ({ value: r.code, label: r.name }))
  return (
    <Select
      value={value}
      onChange={e => onChange(e.target.value)}
      options={options}
      className={className}
    />
  )
}
