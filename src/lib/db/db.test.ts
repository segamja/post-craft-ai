// @vitest-environment node
import 'fake-indexeddb/auto'
import type { ContentBlock } from '@shared/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { finishJob, startJob, expireStaleJobs } from '@/features/ai/api/aiJobRepo'
import { getCarousel, revertCarousel, saveCarouselEdit, writeAiCarousel } from '@/features/carousel/api/carouselRepo'
import {
  addUnsplashImage,
  completeUpload,
  deleteImage,
  listImages,
  reorderImages,
  replaceImage,
  reserveReplacement,
  reserveUploads,
} from '@/features/image/api/imageRepo'
import { getPlatformContent, savePlatformEdit, writeAiPlatform } from '@/features/platform/api/platformRepo'
import { createProject, deleteProject, getProject, listProjects } from '@/features/project/api/projectRepo'
import { getStory, revertStory, saveStoryEdit, writeAiStory } from '@/features/story/api/storyRepo'
import { db } from './db'

const jpeg = () => new Blob(['x'], { type: 'image/jpeg' })

async function addReadyImages(projectId: string, n: number) {
  const rows = await reserveUploads(
    projectId,
    Array.from({ length: n }, (_, i) => ({ fileName: `p${i}.jpg` })),
  )
  for (const r of rows) await completeUpload(r.id, { blob: jpeg(), width: 100, height: 100 })
  return rows.map((r) => r.id)
}

const img = (imageId: string): ContentBlock => ({ id: crypto.randomUUID(), type: 'image', imageId, caption: null })
const para = (text: string): ContentBlock => ({ id: crypto.randomUUID(), type: 'paragraph', text })

const emptyPlatform = {
  title: null,
  blocks: [],
  caption: null,
  hashtags: [],
  coverImageId: null,
  mediaImageIds: [],
  verificationItems: [],
}

/** Story + Blog(본문 이미지·커버) + Instagram + Facebook(첨부) + Carousel 까지 갖춘 프로젝트 */
async function seedFullProject() {
  const p = await createProject()
  const ids = await addReadyImages(p.id, 3)
  const [a, b, c] = ids as [string, string, string]
  await writeAiStory(p.id, { title: 't', summary: 's', blocks: [para('x'), img(a), img(b)], verificationItems: [] })
  await writeAiPlatform(p.id, 'blog', { ...emptyPlatform, title: 'blog', blocks: [img(b)], coverImageId: b })
  await writeAiPlatform(p.id, 'instagram', { ...emptyPlatform, caption: 'ig' })
  await writeAiPlatform(p.id, 'facebook', { ...emptyPlatform, caption: 'fb', mediaImageIds: [a, b, c] })
  await writeAiCarousel(p.id, [
    { imageId: a, title: '1', body: '' },
    { imageId: b, title: '2', body: '' },
  ])
  return { p, a, b, c }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('프로젝트', () => {
  it('목록은 updatedAt 내림차순, 페이지 단위로 조회된다', async () => {
    for (let i = 0; i < 3; i++) await createProject({ title: `p${i}` })
    const { items, total } = await listProjects({ limit: 2 })
    expect(total).toBe(3)
    expect(items.map((x) => x.title)).toEqual(['p2', 'p1'])
  })

  it('delete_project: 하위 데이터와 Blob이 모두 지워진다', async () => {
    const { p } = await seedFullProject()
    await deleteProject(p.id)
    expect(await getProject(p.id)).toBeUndefined()
    for (const t of [db.images, db.imageBlobs, db.stories, db.platformContents, db.platformContentMedia,
      db.carousels, db.carouselSlides])
      expect(await t.count()).toBe(0)
  })
})

describe('이미지', () => {
  it('업로드 position은 선택 순서를 따르고, ready 전환마다 imageSetVersion이 오른다', async () => {
    const p = await createProject()
    const rows = await reserveUploads(p.id, [{ fileName: 'a' }, { fileName: 'b' }, { fileName: 'c' }])
    // 완료 순서가 뒤섞여도 position은 유지
    await completeUpload(rows[2]!.id, { blob: jpeg(), width: 1, height: 1 })
    await completeUpload(rows[0]!.id, { blob: jpeg(), width: 1, height: 1 })
    const list = await listImages(p.id)
    expect(list.map((i) => i.fileName)).toEqual(['a', 'b', 'c'])
    expect(list.map((i) => i.status)).toEqual(['ready', 'pending', 'ready'])
    expect((await getProject(p.id))!.imageSetVersion).toBe(2)
  })

  it('DB-06: 11번째 이미지는 거부된다 (Unsplash 포함)', async () => {
    const p = await createProject()
    await addReadyImages(p.id, 9)
    await addUnsplashImage(p.id, {
      photoId: 'u', externalUrl: 'https://x', photographerName: 'n', photographerUrl: 'https://y', downloadLocation: 'z',
    })
    await expect(reserveUploads(p.id, [{ fileName: 'x' }])).rejects.toMatchObject({ code: 'IMAGE_LIMIT_EXCEEDED' })
  })

  it('DB-03: delete_image가 모든 참조를 정리한다', async () => {
    const { p, a, b, c } = await seedFullProject()
    const before = await getStory(p.id)
    await deleteImage(b)

    const story = (await getStory(p.id))!
    expect(story.blocks.some((x) => x.type === 'image' && x.imageId === b)).toBe(false)
    expect(story.version).toBe(before!.version + 1)
    const blog = (await getPlatformContent(p.id, 'blog'))!
    expect(blog.blocks).toHaveLength(0)
    expect(blog.coverImageId).toBeNull()
    expect((await getPlatformContent(p.id, 'facebook'))!.mediaImageIds).toEqual([a, c])
    expect((await getCarousel(p.id))!.slides.map((s) => s.imageId)).toEqual([a, null])
    expect((await listImages(p.id)).map((i) => [i.id, i.position])).toEqual([[a, 0], [c, 1]])
    expect(await db.imageBlobs.get(b)).toBeUndefined()
  })

  it('DB-04: replace_image는 같은 자리에 넣고 모든 참조를 새 ID로 바꾼다', async () => {
    const { p, a, b, c } = await seedFullProject()
    const repl = await reserveReplacement(p.id, 'new.jpg')
    expect((await listImages(p.id)).map((i) => i.id)).toEqual([a, b, c]) // 교체 대기 중엔 목록 제외
    await completeUpload(repl.id, { blob: jpeg(), width: 1, height: 1 })
    await replaceImage(b, repl.id)

    expect((await listImages(p.id)).map((i) => i.id)).toEqual([a, repl.id, c])
    expect((await getStory(p.id))!.blocks.filter((x) => x.type === 'image').map((x) => x.type === 'image' && x.imageId))
      .toEqual([a, repl.id])
    const blog = (await getPlatformContent(p.id, 'blog'))!
    expect(blog.coverImageId).toBe(repl.id)
    expect((await getPlatformContent(p.id, 'facebook'))!.mediaImageIds).toEqual([a, repl.id, c])
    expect((await getCarousel(p.id))!.slides.map((s) => s.imageId)).toEqual([a, repl.id])
    expect(await db.images.get(b)).toBeUndefined()
  })

  it('DB-05: reorder_images는 같은 집합만 허용하고 ID와 imageSetVersion을 바꾸지 않는다', async () => {
    const p = await createProject()
    const [a, b, c] = (await addReadyImages(p.id, 3)) as [string, string, string]
    const version = (await getProject(p.id))!.imageSetVersion
    await expect(reorderImages(p.id, [a, b])).rejects.toMatchObject({ code: 'IMAGE_SET_MISMATCH' })
    await reorderImages(p.id, [c, a, b])
    expect((await listImages(p.id)).map((i) => i.id)).toEqual([c, a, b])
    expect((await getProject(p.id))!.imageSetVersion).toBe(version)
  })
})

describe('참조 무결성', () => {
  it('DB-02: 다른 프로젝트의 이미지는 blocks / cover / slide / media 어디에서도 참조할 수 없다', async () => {
    const { p } = await seedFullProject()
    const other = await createProject()
    const [foreign] = (await addReadyImages(other.id, 1)) as [string]
    const story = (await getStory(p.id))!
    const blog = (await getPlatformContent(p.id, 'blog'))!
    const fb = (await getPlatformContent(p.id, 'facebook'))!
    const car = (await getCarousel(p.id))!

    const bad = { code: 'INVALID_IMAGE_REF' }
    await expect(saveStoryEdit(story.id, { blocks: [img(foreign)] }, story.updatedAt)).rejects.toMatchObject(bad)
    await expect(savePlatformEdit(blog.id, { coverImageId: foreign }, blog.updatedAt)).rejects.toMatchObject(bad)
    await expect(savePlatformEdit(fb.id, { mediaImageIds: [foreign] }, fb.updatedAt)).rejects.toMatchObject(bad)
    await expect(
      saveCarouselEdit(car.id, [{ imageId: foreign, title: '', body: '' }], car.updatedAt),
    ).rejects.toMatchObject(bad)
  })

  it('pending 이미지는 본문 블록에 넣을 수 없다', async () => {
    const { p } = await seedFullProject()
    const [pending] = await reserveUploads(p.id, [{ fileName: 'x' }])
    const story = (await getStory(p.id))!
    await expect(saveStoryEdit(story.id, { blocks: [img(pending!.id)] }, story.updatedAt)).rejects.toMatchObject({
      code: 'INVALID_IMAGE_REF',
    })
  })

  it('DB-09: Instagram 콘텐츠 없이 Carousel을 만들 수 없다', async () => {
    const p = await createProject()
    await writeAiStory(p.id, { title: 't', summary: '', blocks: [para('x')], verificationItems: [] })
    await expect(writeAiCarousel(p.id, [{ imageId: null, title: '', body: '' }])).rejects.toMatchObject({
      code: 'CAROUSEL_INSTAGRAM_ONLY',
    })
  })

  it('Blog 외 플랫폼에 blocks·cover를 넣으면 거부된다', async () => {
    const { p, a } = await seedFullProject()
    const ig = (await getPlatformContent(p.id, 'instagram'))!
    await expect(savePlatformEdit(ig.id, { coverImageId: a }, ig.updatedAt)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    })
  })
})

describe('Story 동기화', () => {
  it('DB-07: 내용이 바뀌면 version이 오르고, 같은 내용이면 유지된다', async () => {
    const p = await createProject()
    const s1 = await writeAiStory(p.id, { title: 't', summary: '', blocks: [para('x')], verificationItems: [] })
    expect(s1.version).toBe(1)
    const s2 = await saveStoryEdit(s1.id, { title: 't' }, s1.updatedAt)
    expect(s2.version).toBe(1)
    expect(s2.userEditedAt).not.toBeNull()
    const s3 = await saveStoryEdit(s2.id, { title: 't2' }, s2.updatedAt)
    expect(s3.version).toBe(2)
  })

  it('낙관적 잠금: 오래된 updatedAt으로 저장하면 CONFLICT', async () => {
    const p = await createProject()
    const s1 = await writeAiStory(p.id, { title: 't', summary: '', blocks: [para('x')], verificationItems: [] })
    await saveStoryEdit(s1.id, { title: 'a' }, s1.updatedAt)
    await expect(saveStoryEdit(s1.id, { title: 'b' }, s1.updatedAt)).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('AI 재생성은 편집 표시를 지우고 직전 내용을 스냅샷으로 남기며, 되돌릴 수 있다', async () => {
    const p = await createProject()
    const s1 = await writeAiStory(p.id, { title: 'v1', summary: '', blocks: [para('x')], verificationItems: [] })
    await saveStoryEdit(s1.id, { title: 'edited' }, s1.updatedAt)
    const s2 = await writeAiStory(p.id, { title: 'v2', summary: '', blocks: [para('y')], verificationItems: [] })
    expect(s2.userEditedAt).toBeNull()
    expect(s2.previousSnapshot).toMatchObject({ title: 'edited' })
    expect((await getProject(p.id))!.status).toBe('generated')

    const reverted = await revertStory(s2.id)
    expect(reverted.title).toBe('edited')
    expect(reverted.previousSnapshot).toBeNull()
  })

  it('플랫폼은 생성 시점의 Story version을 기록한다 (stale 판정 근거)', async () => {
    const { p } = await seedFullProject()
    const story = (await getStory(p.id))!
    expect((await getPlatformContent(p.id, 'instagram'))!.sourceStoryVersion).toBe(story.version)
    await saveStoryEdit(story.id, { summary: 'changed' }, story.updatedAt)
    const after = (await getStory(p.id))!
    expect((await getPlatformContent(p.id, 'instagram'))!.sourceStoryVersion).toBeLessThan(after.version)
  })

  it('Carousel 되돌리기는 이미 삭제된 이미지를 null로 복원한다', async () => {
    const { p, a } = await seedFullProject()
    await writeAiCarousel(p.id, [{ imageId: null, title: 'new', body: '' }])
    await deleteImage(a)
    const car = await revertCarousel((await getCarousel(p.id))!.id)
    expect(car.slides.map((s) => [s.title, s.imageId])).toEqual([['1', null], ['2', expect.any(String)]])
  })
})

describe('AI 작업', () => {
  it('DB-08: 같은 단계가 실행 중이면 중복 시작이 거부된다', async () => {
    const p = await createProject()
    const job = await startJob(p.id, 'generate_platform', 'blog')
    await expect(startJob(p.id, 'generate_platform', 'blog')).rejects.toMatchObject({ code: 'JOB_IN_PROGRESS' })
    await startJob(p.id, 'generate_platform', 'instagram') // 다른 대상은 허용
    await finishJob(job.id, { ok: true })
    await startJob(p.id, 'generate_platform', 'blog')
  })

  it('5분 넘은 running 작업은 AI_TIMEOUT으로 정리된다', async () => {
    const p = await createProject()
    const job = await startJob(p.id, 'generate_story')
    expect(await expireStaleJobs(Date.now() + 6 * 60 * 1000)).toBe(1)
    expect(await db.aiJobs.get(job.id)).toMatchObject({ status: 'failed', errorCode: 'AI_TIMEOUT' })
  })
})
