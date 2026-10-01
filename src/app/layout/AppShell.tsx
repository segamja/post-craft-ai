import { useState } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from '@/components/common/Toaster'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
        />
      )}
      <div className="lg:pl-60">
        <TopBar menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
