import type { AiJob, AiStep, Platform, UUID } from '@shared/domain'
import { AppError, type ErrorCode } from '@shared/errorCodes'
import { AI_RULES } from '@shared/platformRules'
import { db } from '@/lib/db/db'
import { newId, nowIso } from '@/lib/db/time'

// 생성 작업 기록 (명세 §6.10, §10.2). 로컬 DB이므로 일일 한도는 UI 안내용이며,
// 실제 비용 보호는 Vercel Function 쪽 제한으로 한다 (개발계획 §1.5).

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export const countTodayJobs = () => db.aiJobs.where('startedAt').aboveOrEqual(startOfToday()).count()

export const listRunningJobs = (projectId: UUID) =>
  db.aiJobs
    .where('projectId')
    .equals(projectId)
    .filter((j) => j.status === 'running')
    .toArray()

/** 같은 단계 중복 실행 차단 (ai_jobs_running_uq) + 일일 한도 */
export async function startJob(projectId: UUID, step: AiStep, target: Platform | null = null): Promise<AiJob> {
  return db.transaction('rw', db.aiJobs, async () => {
    const running = await listRunningJobs(projectId)
    if (running.some((j) => j.step === step && j.target === target)) throw new AppError('JOB_IN_PROGRESS')
    if ((await countTodayJobs()) >= AI_RULES.dailyJobLimit) throw new AppError('RATE_LIMITED')
    const job: AiJob = {
      id: newId(),
      projectId,
      step,
      target,
      status: 'running',
      errorCode: null,
      inputTokens: null,
      outputTokens: null,
      startedAt: nowIso(),
      finishedAt: null,
    }
    await db.aiJobs.add(job)
    return job
  })
}

export async function finishJob(
  id: UUID,
  result: { ok: true; inputTokens?: number; outputTokens?: number } | { ok: false; errorCode: ErrorCode },
): Promise<void> {
  await db.aiJobs.update(
    id,
    result.ok
      ? {
          status: 'succeeded',
          inputTokens: result.inputTokens ?? null,
          outputTokens: result.outputTokens ?? null,
          finishedAt: nowIso(),
        }
      : { status: 'failed', errorCode: result.errorCode, finishedAt: nowIso() },
  )
}

/** 5분 넘게 running인 작업을 AI_TIMEOUT으로 정리 (명세 §17.7 3). 앱 시작 시 호출 */
export async function expireStaleJobs(now = Date.now()): Promise<number> {
  const cutoff = new Date(now - AI_RULES.jobTimeoutMs).toISOString()
  return db.aiJobs
    .filter((j) => j.status === 'running' && j.startedAt < cutoff)
    .modify({ status: 'failed', errorCode: 'AI_TIMEOUT', finishedAt: new Date(now).toISOString() })
}

/**
 * 생성 중에 창을 닫거나 새로고침하면 그 작업은 브라우저와 함께 끝난다.
 * 실행 중인 탭은 Web Lock(`pipeline:{projectId}`)을 잡고 있으므로, 아무도 잡고 있지 않은데
 * running으로 남은 작업은 중단된 것으로 정리한다 (명세 §10.2 진행 상태 복원).
 */
export async function reconcileInterruptedJobs(projectId: UUID): Promise<number> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks) return 0
  const { held = [] } = await locks.query()
  if (held.some((l) => l.name === pipelineLockName(projectId))) return 0
  return db.aiJobs
    .where('projectId')
    .equals(projectId)
    .filter((j) => j.status === 'running')
    .modify({ status: 'failed', errorCode: 'JOB_INTERRUPTED', finishedAt: nowIso() })
}

export const pipelineLockName = (projectId: UUID) => `pipeline:${projectId}`

/** 파이프라인·재생성 실행 동안 Web Lock을 잡는다 (지원하지 않는 환경에서는 그냥 실행) */
export function withPipelineLock<T>(projectId: UUID, fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request(pipelineLockName(projectId), fn) : fn()
}
