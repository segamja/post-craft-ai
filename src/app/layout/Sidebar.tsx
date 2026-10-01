import { FolderOpen, HardDrive, Home, Plus, Settings } from 'lucide-react'
import { AI_RULES } from '@shared/platformRules'
import { Link, NavLink } from 'react-router'
import { CreditMeter } from '@/components/common/CreditMeter'
import { useTodayJobCount } from '@/features/ai/api/aiJobQueries'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '홈', icon: Home, end: true },
  { to: '/projects', label: '내 콘텐츠', icon: FolderOpen, end: true },
  { to: '/settings', label: '설정', icon: Settings, end: false },
] as const

/** 데스크톱은 고정, 모바일(lg 미만)은 open일 때만 드로어로 표시 (명세 §23) */
export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const used = useTodayJobCount()

  return (
    <aside
      id="app-sidebar"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) onNavigate?.()
      }}
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-60 flex-col justify-between border-r bg-surface px-4 py-5 lg:z-40 lg:flex',
        open ? 'flex shadow-floating' : 'hidden',
      )}
    >
      <div className="flex flex-col gap-6">
        <Link to="/" className="px-2" aria-label="PostCraft AI 홈">
          <Logo />
        </Link>

        <Link
          to="/projects/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="size-4" aria-hidden="true" />새 콘텐츠
        </Link>

        <nav className="flex flex-col gap-1" aria-label="주요 메뉴">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                  isActive
                    ? 'bg-primary-light font-semibold text-primary-dark'
                    : 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <CreditMeter used={used ?? 0} limit={AI_RULES.dailyJobLimit} />
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <HardDrive className="size-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col">
            {/* 단일 사용자: 데이터는 이 브라우저(IndexedDB)에만 저장된다 */}
            <span className="truncate font-semibold">내 작업공간</span>
            <span className="truncate text-body-sm text-ink-muted">이 브라우저에 저장됨</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
