import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './layout/AppShell'
import { PageLoading } from '@/components/common/PageLoading'
import { RequireConsent } from '@/features/consent/components/RequireConsent'
import { ConsentPage } from '@/pages/ConsentPage'
import { HomePage } from '@/pages/HomePage'
import { NewProjectPage } from '@/pages/NewProjectPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProjectsPage } from '@/pages/ProjectsPage'

// 라우팅: 명세 §13.2. 단일 사용자(로그인 없음). 앱 화면은 AI 처리 동의 후에만 접근한다.
// 편집 화면(dnd-kit, 편집기)과 설정은 필요할 때 불러온다.

/** 지연 로딩 라우트. 첫 화면이 지연 라우트일 때 보여줄 HydrateFallback을 함께 지정한다 */
const lazyPage = (load: () => Promise<ComponentType>): Pick<RouteObject, 'lazy' | 'HydrateFallback'> => ({
  lazy: async () => ({ Component: await load() }),
  HydrateFallback: PageLoading,
})

export const routes: RouteObject[] = [
  { path: '/onboarding/consent', element: <ConsentPage /> },
  { path: '/privacy', ...lazyPage(async () => (await import('@/pages/LegalPage')).PrivacyPage) },
  { path: '/terms', ...lazyPage(async () => (await import('@/pages/LegalPage')).TermsPage) },
  {
    element: (
      <RequireConsent>
        <AppShell />
      </RequireConsent>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/new', element: <NewProjectPage /> },
      {
        path: 'projects/:id',
        ...lazyPage(async () => (await import('@/pages/ProjectInputPage')).ProjectInputPage),
      },
      {
        path: 'projects/:id/result',
        ...lazyPage(async () => (await import('@/pages/ProjectResultPage')).ProjectResultPage),
      },
      { path: 'settings', ...lazyPage(async () => (await import('@/pages/SettingsPage')).SettingsPage) },
      ...(import.meta.env.DEV
        ? [{ path: 'dev/tokens', ...lazyPage(async () => (await import('@/pages/DesignTokensPage')).DesignTokensPage) }]
        : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)
