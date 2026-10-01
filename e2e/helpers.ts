import path from 'node:path'
import { expect, type Page } from '@playwright/test'

const DESIGN = path.resolve('public/images/stitch_design_document_setup')

/** 실제 이미지 파일 (Stitch 화면 캡처 PNG) — 브라우저 전처리(리사이즈·재인코딩)를 그대로 거친다 */
export const FIXTURES = [
  path.join(DESIGN, 'home_dashboard/screen.png'),
  path.join(DESIGN, 'new_content/screen.png'),
  path.join(DESIGN, 'story_result_workspace/screen.png'),
]

export async function consent(page: Page, path = '/') {
  await page.goto(path)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: '동의하고 시작하기' }).click()
}

/** 새 프로젝트를 만들고 사진을 올린 뒤 모두 처리될 때까지 기다린다 */
export async function createProjectWithPhotos(page: Page, files = FIXTURES) {
  await page.getByRole('link', { name: '새 콘텐츠' }).first().click()
  await expect(page.getByRole('heading', { name: '새 콘텐츠 만들기' })).toBeVisible()
  await page.getByTestId('image-input').setInputFiles(files)
  const list = page.getByRole('list', { name: '업로드한 사진' })
  await expect(list.getByRole('img')).toHaveCount(files.length, { timeout: 30_000 })
  await expect(list.getByRole('status')).toHaveCount(0)
  return list
}
