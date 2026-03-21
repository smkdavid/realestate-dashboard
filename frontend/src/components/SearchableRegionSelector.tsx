import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useKbPriceRegions, useKbSentimentRegions } from '@/hooks/useApi'

interface Region { code: string; name: string }

interface SearchableRegionSelectorProps {
  value: string
  onChange: (code: string) => void
  type?: 'price' | 'sentiment'
  /** 정적 목록을 직접 전달하면 API 호출 없이 사용 */
  regions?: Region[]
  placeholder?: string
  className?: string
}

function useRegions(type: 'price' | 'sentiment', staticRegions?: Region[]) {
  const priceQuery = useKbPriceRegions()
  const sentimentQuery = useKbSentimentRegions()

  if (staticRegions) return { data: staticRegions, isLoading: false }
  if (type === 'sentiment') return sentimentQuery
  return priceQuery
}

export function SearchableRegionSelector({
  value,
  onChange,
  type = 'price',
  regions: staticRegions,
  placeholder = '지역 검색...',
  className,
}: SearchableRegionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: regions = [], isLoading } = useRegions(type, staticRegions)

  const selected = regions.find(r => r.code === value)

  const filtered = query
    ? regions.filter(r => r.name.includes(query) || r.code.includes(query))
    : regions

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(code: string) {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  function handleToggle() {
    setOpen(prev => !prev)
    if (!open) setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {isLoading ? '로딩 중...' : (selected ? selected.name : placeholder)}
        </span>
        <svg className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-md">
          {/* 검색창 */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="지역명 검색..."
              className="w-full rounded-sm bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* 목록 */}
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground">검색 결과 없음</li>
            ) : (
              filtered.map(r => (
                <li
                  key={r.code}
                  onClick={() => handleSelect(r.code)}
                  className={cn(
                    'cursor-pointer px-3 py-1.5 hover:bg-accent hover:text-accent-foreground',
                    r.code === value && 'bg-accent/50 font-medium',
                  )}
                >
                  {r.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
