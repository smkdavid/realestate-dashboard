import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, TrendingUp, BarChart3, Building2,
  CircleDollarSign, Map, Users, Settings,
  ArrowUpDown, LineChart, Battery, Grid3X3, MapPin, Globe
} from 'lucide-react'

interface NavItem {
  to: string
  icon: any
  label: string
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/',          icon: LayoutDashboard, label: '종합 대시보드' },
      { to: '/living',    icon: TrendingUp,      label: '실거주지수' },
      { to: '/prices',    icon: BarChart3,        label: '가격/심리' },
      { to: '/supply',    icon: Building2,        label: '공급/거래' },
      { to: '/economy',   icon: CircleDollarSign, label: '경제지표' },
      { to: '/regions',   icon: Map,              label: '지역비교' },
      { to: '/population',icon: Users,            label: '인구/소득' },
    ],
  },
  {
    title: 'KB 상세 분석',
    items: [
      { to: '/top-movers',   icon: ArrowUpDown, label: '변동률 순위' },
      { to: '/multi-chart',  icon: LineChart,    label: '다중 비교차트' },
      { to: '/charging',     icon: Battery,      label: '충전지수' },
      { to: '/heatmap',      icon: Grid3X3,      label: '히트맵' },
      { to: '/metro-map',    icon: MapPin,       label: '수도권 지도' },
      { to: '/national-map', icon: Globe,        label: '전국 지도' },
    ],
  },
  {
    items: [
      { to: '/admin', icon: Settings, label: '관리자' },
    ],
  },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 사이드바 */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center px-4 border-b border-border">
          <span className="text-base font-bold text-foreground">부동산 대시보드</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">매일 10:00 KST 자동갱신</p>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
