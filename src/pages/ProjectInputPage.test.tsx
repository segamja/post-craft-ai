import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { Providers } from '@/app/Providers'
import { giveConsent } from '@/features/consent/api/consentRepo'
import { addUnsplashImage } from '@/features/image/api/imageRepo'
import { createProject, getProject } from '@/features/project/api/projectRepo'
import { getGenerateBlockers } from '@/features/project/model/readiness'
import { db } from '@/lib/db/db'

function renderAt(path: string) {
  render(
    <Providers>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </Providers>,
  )
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await giveConsent()
})

describe('입력 화면', () => {
  it('목적·톤·설명을 바꾸면 자동 저장되고, 다시 열어도 유지된다', async () => {
    const p = await createProject()
    renderAt(`/projects/${p.id}`)

    await userEvent.click(await screen.findByRole('radio', { name: '카페/맛집' }))
    await userEvent.click(screen.getByRole('radio', { name: /반말/ }))
    await userEvent.type(screen.getByLabelText('사진 설명'), '성수동 카페')
    expect(screen.getByText('6 / 1,000자')).toBeInTheDocument()

    await waitFor(
      async () =>
        expect(await getProject(p.id)).toMatchObject({
          purpose: 'cafe_restaurant',
          tone: 'casual',
          sourceDescription: '성수동 카페',
        }),
      { timeout: 3000 },
    )
    expect(await screen.findByText('저장됨')).toBeInTheDocument()
  })

  it('기타 목적은 상세 입력란이 나타나고, 비어 있으면 생성 버튼이 막힌다', async () => {
    const p = await createProject()
    // jsdom + fake-indexeddb에서는 Blob이 보존되지 않아 Blob이 없는 Unsplash 이미지로 준비
    await addUnsplashImage(p.id, {
      photoId: 'u',
      externalUrl: 'https://images.unsplash.com/x',
      photographerName: 'n',
      photographerUrl: 'https://unsplash.com/@n',
      downloadLocation: 'https://api.unsplash.com/photos/u/download',
    })
    renderAt(`/projects/${p.id}`)

    const cta = await screen.findByRole('button', { name: /AI로 콘텐츠 만들기/ })
    expect(cta).toBeEnabled()
    await userEvent.click(screen.getByRole('radio', { name: '기타' }))
    expect(cta).toBeDisabled()
    expect(screen.getByText('· 기타 목적의 내용을 입력해주세요.')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('예: 동네 플리마켓 홍보'), '플리마켓')
    expect(cta).toBeEnabled()
  })
})

describe('getGenerateBlockers', () => {
  const draft = { title: '', purpose: 'daily' as const, purposeDetail: null, sourceDescription: '', tone: 'polite' as const }

  it('사진이 없거나 처리 중·실패한 사진이 있으면 막는다', () => {
    expect(getGenerateBlockers(draft, [])).toHaveLength(1)
    expect(getGenerateBlockers(draft, [{ status: 'ready' }, { status: 'pending' }])).toEqual(['사진을 처리하는 중이에요.'])
    expect(getGenerateBlockers(draft, [{ status: 'failed' }])).toHaveLength(1)
    expect(getGenerateBlockers(draft, [{ status: 'ready' }])).toEqual([])
  })
})
