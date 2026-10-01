import { expect, test } from '@playwright/test'
import { consent, createProjectWithPhotos, FIXTURES } from './helpers.js'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('SNS 바로 글쓰기: 내용을 복사하고 글쓰기 화면을 새 창으로 연다 + 슬라이드 이미지 저장', async ({ page, context }) => {
  // 외부 사이트는 실제로 열지 않고 가로챈다
  await context.route(/^https:\/\/(blog\.naver\.com|www\.instagram\.com|www\.facebook\.com|[a-z0-9-]+\.tistory\.com)\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>external</title>' }),
  )

  await consent(page)
  await createProjectWithPhotos(page, FIXTURES.slice(0, 2))
  await page.getByLabel('사진 설명').fill('제주 여행')
  await page.getByRole('button', { name: /AI로 콘텐츠 만들기/ }).click()
  await expect(page.getByRole('region', { name: '생성 진행 상황' })).toHaveCount(0, { timeout: 30_000 })

  // 블로그 → 네이버
  await page.getByRole('tab', { name: 'Blog' }).click()
  const [naver] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: '네이버 블로그에 글쓰기' }).click()])
  expect(naver.url()).toBe('https://blog.naver.com/GoBlogWrite.naver')
  await naver.close()
  const html = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read()
    return (await item!.getType('text/html')).text()
  })
  expect(html).toContain('[사진 1 넣을 자리 · 사진1.jpg]')
  await expect(page.getByText('내용을 복사했어요').first()).toBeVisible()

  // 티스토리: 주소를 먼저 묻고, 저장 후 열린다
  await page.getByRole('button', { name: '티스토리에 글쓰기' }).click()
  await page.getByLabel('티스토리 블로그 주소').fill('https://myblog.tistory.com')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  const [tistory] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: '티스토리에 글쓰기' }).click()])
  expect(tistory.url()).toBe('https://myblog.tistory.com/manage/newpost/')
  await tistory.close()

  // Instagram: 캡션 + 해시태그 복사
  await page.getByRole('tab', { name: 'Instagram' }).click()
  const [ig] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Instagram 열기' }).click()])
  expect(ig.url()).toBe('https://www.instagram.com/')
  await ig.close()
  const caption = await page.evaluate(() => navigator.clipboard.readText())
  expect(caption).toMatch(/#\S+/)

  // Carousel: 슬라이드를 이미지로 내려받는다
  await page.getByRole('tab', { name: 'Carousel' }).click()
  const button = page.getByRole('button', { name: /슬라이드 이미지 저장/ })
  const count = Number((await button.textContent())!.match(/\((\d+)\)/)![1])
  const downloads: string[] = []
  const saves: Promise<void>[] = []
  page.on('download', (d) => {
    downloads.push(d.suggestedFilename())
    // 렌더링 결과를 눈으로 확인할 수 있게 남긴다
    if (downloads.length === 1) saves.push(d.saveAs(test.info().outputPath('slide1.jpg')))
  })
  await button.click()
  await expect.poll(() => downloads.length, { timeout: 15_000 }).toBe(count)
  expect(downloads[0]).toBe('슬라이드1.jpg')
  await Promise.all(saves)
})
