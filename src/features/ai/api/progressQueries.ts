import { PLATFORMS, type AiJob, type AiStep, type Platform, type UUID } from '@shared/domain'
import type { ErrorCode } from '@shared/errorCodes'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/db'
import { listPositionedImages } from '@/lib/db/rules'

// 콘텐츠 단위 생성 상태 (명세 §12.3): ai_jobs + 데이터 존재 여부로 파생, 저장하지 않는다.
export type UnitStatus = 'none' | 'generating' | 'ready' | 'failed'

export type UnitKey = 'analyze' | 'story' | Platform | 'carousel'

export interface UnitProgress {
  key: UnitKey
  status: UnitStatus
  errorCode: ErrorCode | null
}

export interface GenerationProgress {
  units: UnitProgress[]
  analyzed: number
  total: number
  anyRunning: boolean
  anyFailed: boolean
  hasStory: boolean
}

const jobKey = (step: AiStep, target: Platform | null) => `${step}:${target ?? ''}`

const UNIT_JOB: Record<UnitKey, string> = {
  analyze: jobKey('analyze_images', null),
  story: jobKey('generate_story', null),
  blog: jobKey('generate_platform', 'blog'),
  instagram: jobKey('generate_platform', 'instagram'),
  facebook: jobKey('generate_platform', 'facebook'),
  carousel: jobKey('generate_carousel', null),
}

export function deriveStatus(hasData: boolean, latest: AiJob | undefined): Omit<UnitProgress, 'key'> {
  if (latest?.status === 'running') return { status: 'generating', errorCode: null }
  if (latest?.status === 'failed') return { status: 'failed', errorCode: (latest.errorCode as ErrorCode) ?? null }
  return { status: hasData ? 'ready' : 'none', errorCode: null }
}

export async function loadProgress(projectId: UUID): Promise<GenerationProgress> {
  const [images, analyses, story, platforms, carousel, jobs] = await Promise.all([
    listPositionedImages(projectId),
    db.imageAnalyses.where('projectId').equals(projectId).primaryKeys(),
    db.stories.where('projectId').equals(projectId).first(),
    db.platformContents.where('projectId').equals(projectId).toArray(),
    db.carousels.where('projectId').equals(projectId).first(),
    db.aiJobs.where('projectId').equals(projectId).toArray(),
  ])

  // 단계별 가장 최근 작업
  const latest = new Map<string, AiJob>()
  for (const j of jobs.sort((a, b) => a.startedAt.localeCompare(b.startedAt))) latest.set(jobKey(j.step, j.target), j)

  const ready = images.filter((i) => i.status === 'ready')
  const analyzedSet = new Set(analyses as UUID[])
  const analyzed = ready.filter((i) => analyzedSet.has(i.id)).length
  const has: Record<UnitKey, boolean> = {
    analyze: ready.length > 0 && analyzed === ready.length,
    story: !!story,
    blog: platforms.some((p) => p.platform === 'blog'),
    instagram: platforms.some((p) => p.platform === 'instagram'),
    facebook: platforms.some((p) => p.platform === 'facebook'),
    carousel: !!carousel,
  }

  const keys: UnitKey[] = ['analyze', 'story', ...PLATFORMS, 'carousel']
  const units = keys.map((key) => ({ key, ...deriveStatus(has[key], latest.get(UNIT_JOB[key])) }))
  return {
    units,
    analyzed,
    total: ready.length,
    anyRunning: units.some((u) => u.status === 'generating'),
    anyFailed: units.some((u) => u.status === 'failed'),
    hasStory: has.story,
  }
}

export const useGenerationProgress = (projectId: UUID) =>
  useLiveQuery(() => loadProgress(projectId), [projectId])
