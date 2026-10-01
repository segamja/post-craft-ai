import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { Providers } from '@/app/Providers'
import { giveConsent } from '@/features/consent/api/consentRepo'
import { writeAiCarousel } from '@/features/carousel/api/carouselRepo'
import { addUnsplashImage } from '@/features/image/api/imageRepo'
import { writeAiPlatform } from '@/features/platform/api/platformRepo'
import { createProject } from '@/features/project/api/projectRepo'
import { getStory, saveStoryEdit, writeAiStory } from '@/features/story/api/storyRepo'
import { db } from '@/lib/db/db'

const unsplash = (id: string) => ({
  photoId: id,
  externalUrl: `https://images.unsplash.com/${id}`,
  photographerName: '홍길동',
  photographerUrl: 'https://unsplash.com/@hong',
  downloadLocation: `https://api.unsplash.com/photos/${id}/download`,
})

const empty = { title: null, blocks: [], caption: null, hashtags: [], coverImageId: null, mediaImageIds: [], verificationItems: [] }

async function seed() {
  const p = await createProject({ title: '제주 여행' })
  const img = await addUnsplashImage(p.id, unsplash('a'), '바닷가 노을')
  await writeAiStory(p.id, {
    title: '애월의 노을',
    summary: '요약',
    blocks: [
      { id: 'b1', type: 'paragraph', text: '첫 문단' },
      { id: 'b2', type: 'image', imageId: img.id, caption: null },
    ],
    verificationItems: [{ id: 'v1', text: '영업시간 오전 10시', reason: '확인되지 않음', resolved: false }],
  })
  await writeAiPlatform(p.id, 'blog', { ...empty, title: '블로그', blocks: [{ id: 'x', type: 'paragraph', text: 'b' }], coverImageId: img.id })
  await writeAiPlatform(p.id, 'instagram', { ...empty, caption: '인스타 캡션', hashtags: ['제주'] })
  await writeAiPlatform(p.id, 'facebook', { ...empty, caption: '페북', mediaImageIds: [img.id] })
  await writeAiCarousel(p.id, [{ imageId: img.id, title: '표지', body: '본문' }])
  return { p, img }
}

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

describe('결과 편집 화면', () => {
  it('TC-10: Story를 편집하면 자동 저장되고, 다시 열어도 유지된다', async () => {
    const { p } = await seed()
    renderAt(`/projects/${p.id}/result`)
    const title = await screen.findByLabelText('Story 제목')
    await userEvent.clear(title)
    await userEvent.type(title, '새 제목')
    await waitFor(async () => expect((await getStory(p.id))!.title).toBe('새 제목'), { timeout: 4000 })
    const s = (await getStory(p.id))!
    expect(s.userEditedAt).not.toBeNull()
    expect(s.version).toBe(2)
  })

  it('TC-09: Story가 바뀌면 플랫폼 탭에 "업데이트 필요" 표시', async () => {
    const { p } = await seed()
    renderAt(`/projects/${p.id}/result`)
    const tabs = await screen.findByRole('tablist', { name: '콘텐츠 종류' })
    expect(within(tabs).queryAllByText('(업데이트 필요)')).toHaveLength(0)

    const s = (await getStory(p.id))!
    await act(() => saveStoryEdit(s.id, { summary: '바뀐 요약' }, s.updatedAt))
    await waitFor(() => expect(within(tabs).getAllByText('(업데이트 필요)')).toHaveLength(3))
  })

  it('TC-11: 편집 중에 다른 창에서 수정되면 충돌 모달이 뜨고, 최신 내용을 불러올 수 있다', async () => {
    const { p } = await seed()
    renderAt(`/projects/${p.id}/result`)
    const summary = await screen.findByLabelText('요약')
    // 이 창에서 편집 중 (아직 저장 전)
    await userEvent.type(summary, ' 이 창')
    // 다른 창의 저장
    const s = (await getStory(p.id))!
    await act(() => saveStoryEdit(s.id, { title: '다른 창 제목' }, s.updatedAt))

    const dialog = await screen.findByRole('alertdialog', { name: '다른 창에서 수정되었습니다' })
    await userEvent.click(within(dialog).getByRole('button', { name: '최신 내용 불러오기' }))
    await waitFor(() => expect(screen.getByLabelText('Story 제목')).toHaveValue('다른 창 제목'))
    expect(screen.getByLabelText('요약')).toHaveValue('요약')
  })

  it('TC-08: 직접 수정한 콘텐츠를 다시 생성하려 하면 경고하고, AI 재생성 뒤에는 되돌리기를 제공한다', async () => {
    const { p } = await seed()
    const s = (await getStory(p.id))!
    await saveStoryEdit(s.id, { title: '내가 고친 제목' }, s.updatedAt)
    renderAt(`/projects/${p.id}/result`)

    expect(await screen.findByText('직접 수정한 내용이 있어요. 다시 생성하면 바뀝니다.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Story 다시 생성' }))
    const dialog = await screen.findByRole('alertdialog', { name: '다시 생성할까요?' })
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }))

    // AI 재생성 결과가 들어오면 편집기는 새 내용으로 바뀌고 되돌리기가 생긴다
    await act(() => writeAiStory(p.id, { title: 'AI 새 제목', summary: '', blocks: [{ id: 'n', type: 'paragraph', text: 'x' }], verificationItems: [] }))
    await waitFor(() => expect(screen.getByLabelText('Story 제목')).toHaveValue('AI 새 제목'))
    await userEvent.click(screen.getByRole('button', { name: '이전 내용으로 되돌리기' }))
    await waitFor(() => expect(screen.getByLabelText('Story 제목')).toHaveValue('내가 고친 제목'))
  })

  it('확인 필요 정보를 "확인 완료"로 표시하면 저장된다', async () => {
    const { p } = await seed()
    renderAt(`/projects/${p.id}/result`)
    await userEvent.click(await screen.findByRole('button', { name: '확인 완료' }))
    await waitFor(async () => expect((await getStory(p.id))!.verificationItems[0]!.resolved).toBe(true), { timeout: 4000 })
  })

  it('Instagram 캡션 편집과 해시태그 추가가 저장된다', async () => {
    const { p } = await seed()
    renderAt(`/projects/${p.id}/result?tab=instagram`)
    const caption = await screen.findByLabelText('Instagram 캡션')
    await userEvent.type(caption, '!')
    await userEvent.type(screen.getByLabelText('해시태그 추가'), '#애월{Enter}')
    await waitFor(
      async () => {
        const ig = await db.platformContents.where('[projectId+platform]').equals([p.id, 'instagram']).first()
        expect(ig).toMatchObject({ caption: '인스타 캡션!', hashtags: ['제주', '애월'] })
      },
      { timeout: 4000 },
    )
  })

  it('Carousel: 슬라이드를 추가하고 문구를 고치면 저장된다', async () => {
    const { p } = await seed()
    renderAt(`/projects/${p.id}/result?tab=carousel`)
    await userEvent.click(await screen.findByRole('button', { name: /새 슬라이드/ }))
    expect(screen.getByRole('heading', { name: '슬라이드 2 편집' })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: /슬라이드 제목/ }), '마무리')
    await waitFor(
      async () => {
        const slides = await db.carouselSlides.where('projectId').equals(p.id).sortBy('position')
        expect(slides.map((s) => [s.title, s.imageId === null])).toEqual([
          ['표지', false],
          ['마무리', true],
        ])
      },
      { timeout: 4000 },
    )
  })
})
