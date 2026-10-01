// @vitest-environment node
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '@/features/project/api/projectRepo'
import { db } from '@/lib/db/db'
import { pipelineLockName, reconcileInterruptedJobs, startJob } from './aiJobRepo'

beforeEach(async () => {
  await db.delete()
  await db.open()
})
afterEach(() => vi.unstubAllGlobals())

const stubLocks = (held: string[]) =>
  vi.stubGlobal('navigator', { locks: { query: async () => ({ held: held.map((name) => ({ name })) }) } })

describe('TC-15 중단된 생성 작업 정리', () => {
  it('어느 탭도 잠금을 잡고 있지 않으면 running 작업을 JOB_INTERRUPTED로 바꾼다', async () => {
    const p = await createProject()
    const job = await startJob(p.id, 'generate_story')
    stubLocks([])
    expect(await reconcileInterruptedJobs(p.id)).toBe(1)
    expect(await db.aiJobs.get(job.id)).toMatchObject({ status: 'failed', errorCode: 'JOB_INTERRUPTED' })
  })

  it('다른 탭이 실행 중(잠금 보유)이면 그대로 둔다', async () => {
    const p = await createProject()
    const job = await startJob(p.id, 'generate_story')
    stubLocks([pipelineLockName(p.id)])
    expect(await reconcileInterruptedJobs(p.id)).toBe(0)
    expect((await db.aiJobs.get(job.id))!.status).toBe('running')
  })
})
