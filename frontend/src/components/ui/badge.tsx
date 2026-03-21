import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'up' | 'down' | 'flat'
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
      variant === 'up' && 'bg-red-500/20 text-red-400',
      variant === 'down' && 'bg-blue-500/20 text-blue-400',
      variant === 'flat' && 'bg-muted text-muted-foreground',
      variant === 'default' && 'bg-primary/20 text-primary',
      className
    )} {...props} />
  )
}
