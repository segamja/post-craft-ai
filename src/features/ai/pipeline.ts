import {
  buildAliasMap,
  mapAiBlocks,
  normalizeHashtags,
  resolveRef,
  toAiBlocks,
  toVerificationItems,
  type AliasMap,
} from '@shared/alias'
import { PLATFORMS, type AiStep, type ContentProject, type Platform, type UUID } from '@shared/domain'
import { AppError, isAppError, type ErrorCode } from '@shared/errorCodes'
import { CAROUSEL_RULES, IMAGE_RULES, PLATFORM_RULES } from '@shared/platformRules'
import type { BlogOutT, FacebookOutT, InstagramOutT } from '@shared/schemas/ai'
import {
  AnalyzeImageResponse,
  GenerateCarouselResponse,
  GeneratePlatformResponse,
  GenerateStoryResponse,
  type ImageContextT,
  type ProjectContextT,
  type StoryContextT,
  type UsageT,
} from '@shared/schemas/api'
import type { z } from 'zod'
import { getCarousel, writeAiCarousel } from '@/features/carousel/api/carouselRepo'
import { listAnalyses, listUnanalyzedImages, saveAnalysis } from '@/features/image/api/analysisRepo'
import { listImages } from '@/features/image/api/imageRepo'
import { getPlatformContent, writeAiPlatform, type PlatformContentInput } from '@/features/platform/api/platformRepo'
import { requireProject } from '@/lib/db/rules'
import { newId } from '@/lib/db/time'
import { getStory, writeAiStory } from '@/features/story/api/storyRepo'
import { postApi, type ApiCaller } from '@/lib/apiClient'
import { runPool } from '@/features/image/lib/uploadFiles'
import { finishJob, startJob, withPipelineLock } from './api/aiJobRepo'
import { encodeForAi, type EncodeForAi } from './lib/encodeForAi'

// AI 파이프라인 (명세 §10.2, D-08): 클라이언트가 단계별로 호출하고, 단계 결과를 즉시 저장한다.
// [1] 사진 분석 → [2] Story → [3] 플랫폼 3종 병렬 → [4] Carousel
// 실패하면 그 단계부터 다시 시작하며, 앞 단계 결과는 유지된다.

export interface PipelineDeps {
  api?: ApiCaller
  encode?: EncodeForAi
}

const deps = (d: PipelineDeps = {}) => ({ api: d.api ?? postApi, encode: d.encode ?? encodeForAi })

const codeOf = (e: unknown): ErrorCode => (isAppError(e) ? e.code : 'AI_UPSTREAM_ERROR')

/** ai_jobs 기록으로 감싼다: running → succeeded / failed(error_code) */
async function withJob<T>(
  projectId: UUID,
  step: AiStep,
  target: Platform | null,
  fn: () => Promise<{ result: T; usage: UsageT }>,
): Promise<T> {
  const job = await startJob(projectId, step, target)
  try {
    const { result, usage } = await fn()
    await finishJob(job.id, { ok: true, ...usage })
    return result
  } catch (e) {
    console.error(`[ai] ${step}${target ? `:${target}` : ''}`, e)
    await finishJob(job.id, { ok: false, errorCode: codeOf(e) })
    throw e
  }
}

const addUsage = (a: UsageT, b: UsageT): UsageT => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
})
const ZERO: UsageT = { inputTokens: 0, outputTokens: 0 }

// ─── 맥락 조립 ───────────────────────────────────────────────

const projectContext = (p: ContentProject): ProjectContextT => ({
  purpose: p.purpose,
  purposeDetail: p.purposeDetail,
  tone: p.tone,
  sourceDescription: p.sourceDescription,
})

interface Context {
  project: ProjectContextT
  images: ImageContextT[]
  aliases: AliasMap
}

/** ready 이미지 + 분석 결과 → 별칭 목록. 분석이 빠진 사진이 있으면 생성하지 않는다 */
async function buildContext(projectId: UUID): Promise<Context> {
  const project = await requireProject(projectId)
  const images = (await listImages(projectId)).filter((i) => i.status === 'ready')
  if (images.length === 0) throw new AppError('VALIDATION_FAILED', '사진을 1장 이상 추가해주세요.')
  const analyses = await listAnalyses(projectId)
  const aliases = buildAliasMap(images.map((i) => i.id))
  const ctx: ImageContextT[] = images.map((img, position) => {
    const a = analyses.get(img.id)
    if (!a) throw new AppError('VALIDATION_FAILED', '사진 분석이 끝나지 않았습니다.')
    return {
      alias: aliases.toAlias.get(img.id)!,
      position,
      description: a.description,
      tags: a.tags,
      detectedText: a.detectedText,
    }
  })
  return { project: projectContext(project), images: ctx, aliases }
}

async function storyContext(projectId: UUID, aliases: AliasMap): Promise<StoryContextT> {
  const story = await getStory(projectId)
  if (!story) throw new AppError('NOT_FOUND', 'Story를 먼저 생성해야 합니다.')
  return { title: story.title, summary: story.summary, blocks: toAiBlocks(story.blocks, aliases) }
}

const warnDropped = (step: string, dropped: string[]) => {
  if (dropped.length) console.warn(`[ai] ${step}: 알 수 없는 이미지 별칭 제거`, dropped)
}

// ─── 단계 ────────────────────────────────────────────────────

/** [1] 분석 없는 이미지만 분석 (이미지별 병렬). 하나라도 실패하면 이 단계 실패 */
export async function analyzeImages(projectId: UUID, d?: PipelineDeps): Promise<number> {
  const { api, encode } = deps(d)
  const targets = await listUnanalyzedImages(projectId)
  if (targets.length === 0) return 0

  return withJob(projectId, 'analyze_images', null, async () => {
    let usage = ZERO
    const errors: unknown[] = []
    await runPool(
      targets.map((img) => async () => {
        try {
          const res = await api('/api/analyze-image', { image: await encode(img) }, AnalyzeImageResponse)
          await saveAnalysis(img.id, res.data, res.model)
          usage = addUsage(usage, res.usage)
        } catch (e) {
          errors.push(e)
        }
      }),
      IMAGE_RULES.uploadConcurrency,
    )
    if (errors.length) throw errors[0]
    return { result: targets.length, usage }
  })
}

/** [2] Story 생성 → 저장, project.status = generated */
export async function generateStory(projectId: UUID, d?: PipelineDeps) {
  const { api } = deps(d)
  return withJob(projectId, 'generate_story', null, async () => {
    const ctx = await buildContext(projectId)
    const res = await api('/api/generate-story', { project: ctx.project, images: ctx.images }, GenerateStoryResponse)
    const { blocks, dropped } = mapAiBlocks(res.data.blocks, ctx.aliases, newId)
    warnDropped('story', dropped)
    const story = await writeAiStory(projectId, {
      title: res.data.title,
      summary: res.data.summary,
      blocks,
      verificationItems: toVerificationItems(res.data.verificationItems, newId),
    })
    return { result: story, usage: res.usage }
  })
}

function toPlatformInput(platform: Platform, data: BlogOutT | InstagramOutT | FacebookOutT, aliases: AliasMap) {
  const max = PLATFORM_RULES[platform].hashtagsMax
  const base: PlatformContentInput = {
    title: null,
    blocks: [],
    caption: null,
    hashtags: normalizeHashtags(data.hashtags, max),
    coverImageId: null,
    mediaImageIds: [],
    verificationItems: toVerificationItems(data.verificationItems, newId),
  }
  if (platform === 'blog') {
    const blog = data as BlogOutT
    const { blocks, dropped } = mapAiBlocks(blog.blocks, aliases, newId)
    warnDropped('blog', dropped)
    return { ...base, title: blog.title, blocks, coverImageId: resolveRef(blog.coverImageRef, aliases) }
  }
  if (platform === 'instagram') return { ...base, caption: (data as InstagramOutT).caption }
  const fb = data as FacebookOutT
  const media = [...new Set(fb.mediaImageRefs.map((r) => resolveRef(r, aliases)).filter((x): x is UUID => !!x))]
  return { ...base, caption: fb.caption, mediaImageIds: media.slice(0, PLATFORM_RULES.facebook.mediaMax) }
}

/** [3] 플랫폼 1종 생성 (Story 기반) */
export async function generatePlatform(projectId: UUID, platform: Platform, d?: PipelineDeps) {
  const { api } = deps(d)
  return withJob(projectId, 'generate_platform', platform, async () => {
    const ctx = await buildContext(projectId)
    const story = await storyContext(projectId, ctx.aliases)
    const res = await api(
      '/api/generate-platform',
      { platform, project: ctx.project, images: ctx.images, story },
      GeneratePlatformResponse[platform] as z.ZodType<{ data: BlogOutT | InstagramOutT | FacebookOutT; usage: UsageT; model: string }>,
    )
    const saved = await writeAiPlatform(projectId, platform, toPlatformInput(platform, res.data, ctx.aliases))
    return { result: saved, usage: res.usage }
  })
}

/** [4] Carousel (Instagram 결과 기반). 기본 장수 = min(이미지 수, 설정값) */
export async function generateCarousel(projectId: UUID, d?: PipelineDeps) {
  const { api } = deps(d)
  return withJob(projectId, 'generate_carousel', null, async () => {
    const ctx = await buildContext(projectId)
    const ig = await getPlatformContent(projectId, 'instagram')
    if (!ig) throw new AppError('CAROUSEL_INSTAGRAM_ONLY')
    const story = await storyContext(projectId, ctx.aliases)
    const slideCount = Math.max(CAROUSEL_RULES.slidesMin, Math.min(ctx.images.length, CAROUSEL_RULES.defaultSlidesCap))
    const res = await api(
      '/api/generate-carousel',
      {
        project: ctx.project,
        images: ctx.images,
        story,
        instagram: { caption: ig.caption ?? '', hashtags: ig.hashtags },
        slideCount,
      },
      GenerateCarouselResponse,
    )
    const saved = await writeAiCarousel(
      projectId,
      res.data.slides.map((s) => ({ imageId: resolveRef(s.imageRef, ctx.aliases), title: s.title, body: s.body })),
    )
    return { result: saved, usage: res.usage }
  })
}

// ─── 전체 실행 ───────────────────────────────────────────────

export interface PipelineResult {
  ok: boolean
  /** 실패한 단계와 오류 코드 */
  failures: { step: AiStep; target: Platform | null; code: ErrorCode }[]
}

const inflight = new Map<UUID, Promise<PipelineResult>>()

/**
 * 비어 있는 단계만 채운다. 처음 실행과 "다시 시도"가 같은 함수이며,
 * 이미 만들어진 결과는 다시 만들지 않는다 (재생성은 D3/D6의 단위 재생성으로).
 * 같은 프로젝트에 대해 동시에 두 번 실행되지 않는다.
 */
export function runPipeline(projectId: UUID, d?: PipelineDeps): Promise<PipelineResult> {
  const running = inflight.get(projectId)
  if (running) return running
  const p = withPipelineLock(projectId, () => execute(projectId, d)).finally(() => inflight.delete(projectId))
  inflight.set(projectId, p)
  return p
}

export const isPipelineRunning = (projectId: UUID) => inflight.has(projectId)

async function execute(projectId: UUID, d?: PipelineDeps): Promise<PipelineResult> {
  const failures: PipelineResult['failures'] = []
  const fail = (step: AiStep, target: Platform | null, e: unknown) => {
    failures.push({ step, target, code: codeOf(e) })
    return { ok: false, failures }
  }

  try {
    await analyzeImages(projectId, d)
  } catch (e) {
    return fail('analyze_images', null, e)
  }

  if (!(await getStory(projectId))) {
    try {
      await generateStory(projectId, d)
    } catch (e) {
      return fail('generate_story', null, e)
    }
  }

  const missing: Platform[] = []
  for (const p of PLATFORMS) if (!(await getPlatformContent(projectId, p))) missing.push(p)
  const results = await Promise.allSettled(missing.map((p) => generatePlatform(projectId, p, d)))
  results.forEach((r, i) => {
    if (r.status === 'rejected') fail('generate_platform', missing[i]!, r.reason)
  })

  if (!(await getCarousel(projectId)) && (await getPlatformContent(projectId, 'instagram'))) {
    try {
      await generateCarousel(projectId, d)
    } catch (e) {
      fail('generate_carousel', null, e)
    }
  }

  return { ok: failures.length === 0, failures }
}

// ─── 단위 재생성 (명세 §2.1 MVP: Story / 플랫폼별 / Carousel 전체) ───

export type RegenUnit = 'story' | Platform | 'carousel'

/** 새로 추가된 사진이 있으면 먼저 분석한 뒤 해당 단위만 다시 만든다. 덮어쓰기 전 내용은 스냅샷으로 남는다 */
export function regenerateUnit(projectId: UUID, unit: RegenUnit, d?: PipelineDeps): Promise<void> {
  return withPipelineLock(projectId, async () => {
    await analyzeImages(projectId, d)
    if (unit === 'story') await generateStory(projectId, d)
    else if (unit === 'carousel') await generateCarousel(projectId, d)
    else await generatePlatform(projectId, unit, d)
  })
}
