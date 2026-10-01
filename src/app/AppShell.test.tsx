import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { giveConsent } from '@/features/consent/api/consentRepo'
import { createProject, updateProject } from '@/features/project/api/projectRepo'
import { db } from '@/lib/db/db'
import { Providers } from './Providers'
import { routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('AI 처리 동의', () => {
  it('동의 전에는 동의 화면으로 보내고, 동의 후 원래 경로로 돌아간다', async () => {
    const router = renderAt('/projects')
    const button = await screen.findByRole('button', { name: '동의하고 시작하기' })
    expect(button).toBeDisabled()
    expect(router.state.location.search).toBe('?next=%2Fprojects')

    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(button)
    expect(await screen.findByRole('heading', { name: '내 콘텐츠' })).toBeInTheDocument()
  })
})

describe('AppShell', () => {
  beforeEach(() => giveConsent())

  it('사이드바 메뉴와 홈 화면을 렌더한다', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: '사진 몇 장으로 시작하세요' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '주요 메뉴' })
    expect(nav).toHaveTextContent('내 콘텐츠')
    expect(nav).toHaveTextContent('설정')
    expect(screen.getAllByRole('link', { name: /새 콘텐츠/ })[0]).toHaveAttribute('href', '/projects/new')
  })

  it.each([
    ['/projects', '내 콘텐츠'],
    ['/settings', '설정'],
    ['/projects/not-exist', '찾을 수 없는 페이지예요'],
    ['/nope', '찾을 수 없는 페이지예요'],
  ])('%s 경로를 렌더한다', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('결과 화면은 알 수 없는 tab 값을 story로 처리한다', async () => {
    const p = await createProject()
    renderAt(`/projects/${p.id}/result?tab=xxx`)
    expect(await screen.findByRole('tab', { name: 'Story' })).toHaveAttribute('aria-selected', 'true')
  })

  it('없는 프로젝트의 결과 화면은 찾을 수 없음', async () => {
    renderAt('/projects/abc/result')
    expect(await screen.findByRole('heading', { name: '찾을 수 없는 페이지예요' })).toBeInTheDocument()
  })
})

describe('TC-01 프로젝트 생성 / 조회 / 삭제', () => {
  beforeEach(() => giveConsent())

  it('새 콘텐츠를 만들면 프로젝트가 하나 생기고 입력 화면으로 이동한다', async () => {
    const router = renderAt('/projects/new')
    expect(await screen.findByRole('heading', { name: '새 콘텐츠 만들기' })).toBeInTheDocument()
    const all = await db.projects.toArray()
    expect(all).toHaveLength(1)
    expect(router.state.location.pathname).toBe(`/projects/${all[0]!.id}`)
  })

  it('홈에 최근 프로젝트가 보이고, 목적 필터와 삭제가 동작한다', async () => {
    const a = await createProject({ purpose: 'travel' })
    await updateProject(a.id, { title: '제주 여행' })
    const b = await createProject({ purpose: 'cafe_restaurant' })
    await updateProject(b.id, { title: '성수 카페' })

    renderAt('/')
    expect(await screen.findByRole('link', { name: '제주 여행' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '성수 카페' })).toBeInTheDocument()

    // 필터 칩은 별도 liveQuery라 카드보다 늦게 나타날 수 있다
    await userEvent.click(await screen.findByRole('button', { name: '여행 (1)' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: '성수 카페' })).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '제주 여행 삭제' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: '제주 여행' })).not.toBeInTheDocument())
    expect(await db.projects.get(a.id)).toBeUndefined()
  })

  it('내 콘텐츠는 20개 단위로 페이지를 나눈다', async () => {
    for (let i = 0; i < 21; i++) await createProject()
    renderAt('/projects')
    expect(await screen.findByText('1 / 2')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(20)
    await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
  })
})
