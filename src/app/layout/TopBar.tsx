import { Menu } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { SaveStatusIndicator } from '@/components/common/SaveStatusIndicator'

// 데스크톱: 로고는 사이드바에만 둔다 (개발계획 §1.2). 모바일: 메뉴 버튼 + 로고
export function TopBar({ menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-surface px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onMenu}
          aria-label="메뉴"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          className="rounded-lg p-2 hover:bg-surface-hover"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Link to="/" aria-label="PostCraft AI 홈">
          <Logo />
        </Link>
      </div>
      <div className="hidden lg:block" />
      <SaveStatusIndicator />
    </header>
  )
}
