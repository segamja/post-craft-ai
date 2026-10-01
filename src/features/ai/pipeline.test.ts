// @vitest-environment node
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as analyze } from '../../../api/analyze-image'
import { POST as carousel } from '../../../api/generate-carousel'
import { POST as platform } from '../../../api/generate-platform'
import { POST as story } from '../../../api/generate-story'
import { getCarousel } from '@/features/carousel/api/carouselRepo'
import { listAnalyses } from '@/features/image/api/analysisRepo'
import { completeUpload, listImages, reserveUploads } from '@/features/image/api/imageRepo'
import { replaceWithFile } from '@/features/image/lib/uploadFiles'
import { getPlatformContent, listPlatformContents } from '@/features/platform/api/platformRepo'
import { createProject, getProject, updateProject } from '@/features/project/api/projectRepo'
import { getStory } from '@/features/story/api/storyRepo'
import { db } from '@/lib/db/db'
import { loadProgress } from './api/progressQueries'
import { runPipeline, type PipelineDeps } from './pipeline'

const HANDLERS: Record<string, (r: Request) => Promise<Response>> = {
  '/api/analyze-image': analyze,
  '/api/generate-story': story,
  '/api/generate-platform': platform,
  '/api/generate-carousel': carousel,
}

/** fetch를 로컬 핸들러(Mock 모드)로 연결. failWhen이 참이면 502를 돌려준다 */
function routeFetch(failWhen: (path: string, body: Record<string, unknown>) => boolean = () => false) {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    calls.push(path + (body.platform ? `:${String(body.platform)}` : ''))
    if (failWhen(path, body))
      return Response.json({ ok: false, error: { code: 'AI_UPSTREAM_ERROR', message: 'x' } }, { status: 502 })
    return HANDLERS[path]!(new Request(`http://localhost${path}`, { ...init, method: 'POST' }))
  })
  return calls
}

// node 환경에는 캔버스가 없으므로 분석용 인코딩은 고정값
const deps: PipelineDeps = { encode: async () => ({ dataUrl: 'data:image/jpeg;base64,AAAA' }) }
const jpeg = () => new Blob(['x'], { type: 'image/jpeg' })

async function seed(n = 3) {
  const p = await createProject({ purpose: 'travel' })
  await updateProject(p.id, { sourceDescription: '제주 2박 3일. 노을이 예뻤다' })
  const rows = await reserveUploads(p.id, Array.from({ length: n }, (_, i) => ({ fileName: `p${i}.jpg` })))
  for (const r of rows) await completeUpload(r.id, { blob: jpeg(), width: 10, height: 10 })
  return { p, ids: rows.map((r) => r.id) }
}

beforeEach(async () => {
  vi.stubEnv('AI_MOCK', '1')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await db.delete()
  await db.open()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('AI 파이프라인', () => {
  it('TC-06: 사진 분석 → Story → 플랫폼 3종 → Carousel 을 저장하고, 이미지 참조는 실제 ID로 매핑된다', async () => {
    const { p, ids } = await seed(3)
    routeFetch()
    const result = await runPipeline(p.id, deps)
    expect(result).toEqual({ ok: true, failures: [] })

    expect((await listAnalyses(p.id)).size).toBe(3)
    const s = (await getStory(p.id))!
    const storyImageIds = s.blocks.flatMap((b) => (b.type === 'image' ? [b.imageId] : []))
    expect(storyImageIds).toEqual(ids)
    expect(s.sourceImageSetVersion).toBe((await getProject(p.id))!.imageSetVersion)
    expect((await getProject(p.id))!.status).toBe('generated')

    expect((await listPlatformContents(p.id)).map((x) => x.platform).sort()).toEqual(['blog', 'facebook', 'instagram'])
    const blog = (await getPlatformContent(p.id, 'blog'))!
    expect(blog.coverImageId).toBe(ids[0])
    expect(blog.sourceStoryVersion).toBe(s.version)
    expect((await getPlatformContent(p.id, 'facebook'))!.mediaImageIds).toEqual(ids)

    const c = (await getCarousel(p.id))!
    expect(c.slides.map((x) => x.imageId)).toEqual(ids)

    const progress = await loadProgress(p.id)
    expect(progress.units.every((u) => u.status === 'ready')).toBe(true)
    expect(await db.aiJobs.where('projectId').equals(p.id).count()).toBe(6)
  })

  it('TC-07: Facebook만 실패해도 나머지는 저장되고, 다시 시도하면 실패한 것만 생성한다', async () => {
    const { p } = await seed(2)
    routeFetch((path, body) => path === '/api/generate-platform' && body.platform === 'facebook')
    const first = await runPipeline(p.id, deps)
    expect(first.ok).toBe(false)
    expect(first.failures).toEqual([{ step: 'generate_platform', target: 'facebook', code: 'AI_UPSTREAM_ERROR' }])
    expect(await getPlatformContent(p.id, 'blog')).toBeDefined()
    expect(await getCarousel(p.id)).toBeDefined()
    const progress = await loadProgress(p.id)
    expect(progress.units.find((u) => u.key === 'facebook')).toMatchObject({ status: 'failed', errorCode: 'AI_UPSTREAM_ERROR' })

    const calls = routeFetch()
    const second = await runPipeline(p.id, deps)
    expect(second.ok).toBe(true)
    expect(calls).toEqual(['/api/generate-platform:facebook'])
    expect((await loadProgress(p.id)).anyFailed).toBe(false)
  })

  it('Story 단계가 실패하면 뒤 단계는 실행하지 않고, 분석 결과는 유지된다', async () => {
    const { p } = await seed(2)
    const calls = routeFetch((path) => path === '/api/generate-story')
    await runPipeline(p.id, deps)
    expect(calls.filter((c) => c.startsWith('/api/generate-platform'))).toEqual([])
    expect((await listAnalyses(p.id)).size).toBe(2)
  })

  it('분석 결과를 재사용한다: 새로 추가된 사진만 분석한다', async () => {
    const { p } = await seed(2)
    routeFetch()
    await runPipeline(p.id, deps)
    const [extra] = await reserveUploads(p.id, [{ fileName: 'new.jpg' }])
    await completeUpload(extra!.id, { blob: jpeg(), width: 10, height: 10 })

    const calls = routeFetch()
    await runPipeline(p.id, deps)
    expect(calls).toEqual(['/api/analyze-image'])
    // 사진이 바뀌어도 Story는 자동 재생성하지 않는다 (명세 §4.2)
    const progress = await loadProgress(p.id)
    expect(progress.analyzed).toBe(3)
  })

  it('같은 프로젝트에 동시에 두 번 실행해도 한 번만 돈다', async () => {
    const { p } = await seed(1)
    const calls = routeFetch()
    const [a, b] = await Promise.all([runPipeline(p.id, deps), runPipeline(p.id, deps)])
    expect(a).toBe(b)
    expect(calls.filter((c) => c === '/api/generate-story')).toHaveLength(1)
  })
})

describe('TC-05 교체', () => {
  it('같은 자리에 새 사진이 들어가고, 생성된 콘텐츠의 참조가 새 ID로 바뀐다', async () => {
    const { p, ids } = await seed(3)
    routeFetch()
    await runPipeline(p.id, deps)

    const newId = await replaceWithFile(ids[1]!, p.id, new File(['y'], 'new.jpg', { type: 'image/jpeg' }), {
      preprocess: async () => ({ blob: jpeg(), width: 10, height: 10 }),
    })
    expect((await listImages(p.id)).map((i) => i.id)).toEqual([ids[0], newId, ids[2]])
    const s = (await getStory(p.id))!
    expect(s.blocks.some((b) => b.type === 'image' && b.imageId === newId)).toBe(true)
    expect((await getCarousel(p.id))!.slides[1]!.imageId).toBe(newId)
    // 교체로 사진 구성이 바뀌었으므로 Story는 stale
    expect(s.sourceImageSetVersion).toBeLessThan((await getProject(p.id))!.imageSetVersion)
  })

  it('교체 파일 처리에 실패하면 기존 사진은 그대로 두고 교체용 행을 지운다', async () => {
    const { p, ids } = await seed(2)
    await expect(
      replaceWithFile(ids[0]!, p.id, new File(['y'], 'bad.jpg', { type: 'image/jpeg' }), {
        preprocess: async () => {
          throw new Error('decode')
        },
      }),
    ).rejects.toThrow()
    expect((await listImages(p.id)).map((i) => i.id)).toEqual(ids)
    expect(await db.images.count()).toBe(2)
  })
})
