import { useState } from 'react'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  text: string
  className?: string
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
          bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        aria-label="도움말"
      >
        i
      </button>
      {visible && (
        <span
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            w-56 rounded-md bg-popover border border-border px-3 py-2
            text-xs text-popover-foreground shadow-md leading-relaxed"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-border" />
        </span>
      )}
    </span>
  )
}
