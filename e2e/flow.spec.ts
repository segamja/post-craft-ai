import { readFileSync } from 'node:fs'
import { expect, test, type Locator } from '@playwright/test'
import { SECRET_PATTERN } from '../scripts/secretPattern.js'
import { consent, createProjectWithPhotos } from './helpers.js'

test('TC-02·06·10: 사진 업로드 → AI 생성 → 편집 자동 저장 → 새로고침 후 유지', async ({ page }) => {
  await consent(page)
  const photos = await createProjectWithPhotos(page)
  // TC-02: 선택 순서대로 #1 대표, #2, #3
  await expect(photos.getByText('#1 대표')).toBeVisible()
  await expect(photos.getByText('#3')).toBeVisible()

  await page.getByRole('radio', { name: '여행' }).click()
  await page.getByLabel('사진 설명').fill('제주 애월 2박 3일. 노을이 예뻤다.')
  await page.getByRole('button', { name: /AI로 콘텐츠 만들기/ }).click()

  // TC-06: 단계가 모두 끝나면 진행 표시가 사라지고 Story가 보인다
  await expect(page).toHaveURL(/\/result/)
  await expect(page.getByRole('region', { name: '생성 진행 상황' })).toHaveCount(0, { timeout: 30_000 })
  const title = page.getByLabel('Story 제목')
  await expect(title).toHaveValue(/제주 애월/)

  for (const tab of ['Blog', 'Instagram', 'Facebook', 'Carousel']) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('tabpanel')).not.toContainText('아직')
  }

  // TC-10: 편집 → 저장됨 → 새로고침 → 유지
  await page.getByRole('tab', { name: 'Story' }).click()
  await title.fill('애월 노을 여행기')
  await expect(page.getByText('저장됨')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Story 제목')).toHaveValue('애월 노을 여행기')
})

test('TC-03: 순서를 바꾸면 새로고침 뒤에도 유지된다', async ({ page }) => {
  await consent(page)
  const photos = await createProjectWithPhotos(page)
  const names = async () => (await photos.getByRole('img').all()).map(async (i: Locator) => i.getAttribute('alt'))
  const before = await Promise.all(await names())
  await photos.getByRole('button', { name: /뒤로/ }).first().click()
  await expect.poll(async () => Promise.all(await names())).toEqual([before[1], before[0], before[2]])
  await page.reload()
  await expect.poll(async () => Promise.all(await names())).toEqual([before[1], before[0], before[2]])
})

test('TC-16: Unsplash 사진 추가 시 출처 표시와 download 추적 호출', async ({ page }) => {
  const tracked: string[] = []
  await page.route('**/api/unsplash-search', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: {
          totalPages: 1,
          results: [
            {
              id: 'u1',
              alt: 'jeju sea',
              width: 100,
              height: 100,
              color: '#335577',
              thumbUrl: 'https://images.unsplash.com/photo-test?w=200',
              url: 'https://images.unsplash.com/photo-test?w=1080',
              photographerName: 'Test Kim',
              photographerUrl: 'https://unsplash.com/@testkim',
              downloadLocation: 'https://api.unsplash.com/photos/u1/download',
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/unsplash-track-download', async (route) => {
    tracked.push(route.request().postDataJSON().downloadLocation)
    await route.fulfill({ json: { ok: true } })
  })
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({ path: 'public/images/stitch_design_document_setup/home_dashboard/screen.png' }),
  )

  await consent(page)
  await page.getByRole('link', { name: '새 콘텐츠' }).first().click()
  await page.getByRole('button', { name: 'Unsplash에서 보조 이미지 찾기' }).click()
  const dialog = page.getByRole('dialog', { name: 'Unsplash에서 사진 찾기' })
  await dialog.getByLabel('검색어').fill('jeju')
  await dialog.getByRole('button', { name: '검색' }).click()
  await dialog.getByRole('button', { name: 'jeju sea 추가' }).click()
  await expect(dialog.getByText('추가됨')).toBeVisible()
  await expect.poll(() => tracked).toEqual(['https://api.unsplash.com/photos/u1/download'])
  await dialog.getByRole('button', { name: '닫기' }).click()
  await expect(page.getByRole('list', { name: '업로드한 사진' }).getByText('Unsplash')).toBeVisible()
})

test('TC-12·13: 없는 프로젝트는 차단되고, 브라우저로 내려온 코드와 요청에 OpenAI 키가 없다', async ({ page }) => {
  const env = (() => {
    try {
      return readFileSync('.env.local', 'utf8')
    } catch {
      return ''
    }
  })()
  const secrets = [...env.matchAll(/^(OPENAI_API_KEY|UNSPLASH_ACCESS_KEY|APP_ACCESS_TOKEN)=(.+)$/gm)]
    .map((m) => m[2]!.trim())
    .filter((v) => v.length >= 8)

  const bodies: string[] = []
  const requests: string[] = []
  page.on('request', (r) => requests.push(r.url()))
  page.on('response', async (r) => {
    if (/\.(js|ts|tsx|css|html)(\?|$)/.test(r.url()) || r.url().endsWith('/')) bodies.push(await r.text().catch(() => ''))
  })

  await consent(page, '/projects/does-not-exist')
  await expect(page.getByRole('heading', { name: '찾을 수 없는 페이지예요' })).toBeVisible()
  await page.goto('/projects')
  await page.getByRole('link', { name: '설정' }).click()
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()

  expect(requests.some((u) => u.includes('api.openai.com'))).toBe(false)
  for (const s of secrets) expect(bodies.some((b) => b.includes(s))).toBe(false)
  // 앞이 영숫자가 아닌 sk- 만 (tailwind-merge의 "mask-image-…" 같은 클래스명 제외)
  expect(bodies.filter((b) => SECRET_PATTERN.test(b))).toEqual([])
})
