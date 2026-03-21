import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
        'focus:outline-none focus:ring-1 focus:ring-ring',
        className
      )}
      {...props}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
