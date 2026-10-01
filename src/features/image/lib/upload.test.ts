// @vitest-environment node
import 'fake-indexeddb/auto'
import { AppError } from '@shared/errorCodes'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, getProject } from '@/features/project/api/projectRepo'
import { db } from '@/lib/db/db'
import { listImages } from '../api/imageRepo'
import { fitWithin, isHeic, validateFile } from './preprocess'
import { retryUpload, runPool, uploadFiles } from './uploadFiles'

const file = (name: string, type = 'image/jpeg', size = 1000) =>
  new File([new Uint8Array(size)], name, { type })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const okResult = () => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), width: 10, height: 10 })

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('UT-04 전처리 규칙', () => {
  it('긴 변을 2048px로 줄이고 비율을 유지하며, 작은 사진은 키우지 않는다', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1536, height: 2048 })
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('형식과 크기를 검사한다 (type이 빈 HEIC는 확장자로 허용)', () => {
    expect(validateFile(file('a.jpg'))).toBeNull()
    expect(validateFile(file('a.heic', ''))).toBeNull()
    expect(validateFile(file('a.gif', 'image/gif'))).toBe('UNSUPPORTED_FILE')
    expect(validateFile(file('a.pdf', ''))).toBe('UNSUPPORTED_FILE')
    expect(validateFile({ name: 'big.jpg', type: 'image/jpeg', size: 21 * 1024 * 1024 })).toBe('FILE_TOO_LARGE')
    expect(isHeic(file('IMG_0001.HEIC', ''))).toBe(true)
    expect(isHeic(file('a.jpg'))).toBe(false)
  })
})

describe('업로드 파이프라인', () => {
  it('TC-02: 완료 순서가 달라도 position은 선택 순서를 따르고, 동시 처리는 3개까지', async () => {
    const p = await createProject()
    let running = 0
    let peak = 0
    const delays: Record<string, number> = { a: 40, b: 5, c: 25, d: 1, e: 10 }
    const preprocess = vi.fn(async (f: File) => {
      running++
      peak = Math.max(peak, running)
      await sleep(delays[f.name]!)
      running--
      return okResult()
    })

    const res = await uploadFiles(p.id, ['a', 'b', 'c', 'd', 'e'].map((n) => file(n)), { preprocess })
    const list = await listImages(p.id)
    expect(list.map((i) => i.fileName)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(list.map((i) => i.id)).toEqual(res.reserved)
    expect(new Set(res.reserved).size).toBe(5)
    expect(list.every((i) => i.status === 'ready')).toBe(true)
    expect(peak).toBe(3)
    expect((await getProject(p.id))!.imageSetVersion).toBe(5)
  })

  it('TC-14: 한 장이 실패해도 나머지는 계속 처리되고, 다시 시도하면 같은 자리에서 성공한다', async () => {
    const p = await createProject()
    const onFailed = vi.fn()
    const preprocess = async (f: File) => {
      if (f.name === 'bad') throw new AppError('UNSUPPORTED_FILE')
      return okResult()
    }
    const files = [file('ok1'), file('bad'), file('ok2')]
    const res = await uploadFiles(p.id, files, { preprocess, onFailed })

    expect((await listImages(p.id)).map((i) => [i.fileName, i.status])).toEqual([
      ['ok1', 'ready'],
      ['bad', 'failed'],
      ['ok2', 'ready'],
    ])
    expect(onFailed).toHaveBeenCalledWith(res.reserved[1], 'UNSUPPORTED_FILE')

    await retryUpload(res.reserved[1]!, files[1]!, { preprocess: async () => okResult() })
    const after = await listImages(p.id)
    expect(after[1]).toMatchObject({ id: res.reserved[1], position: 1, status: 'ready' })
  })

  it('형식 오류는 예약하지 않고, 10장을 넘는 파일은 overflow로 돌려준다', async () => {
    const p = await createProject()
    await uploadFiles(p.id, Array.from({ length: 8 }, (_, i) => file(`f${i}`)), { preprocess: async () => okResult() })
    const res = await uploadFiles(p.id, [file('x.gif', 'image/gif'), file('n1'), file('n2'), file('n3')], {
      preprocess: async () => okResult(),
    })
    expect(res.rejected.map((r) => r.code)).toEqual(['UNSUPPORTED_FILE'])
    expect(res.overflow.map((f) => f.name)).toEqual(['n3'])
    expect(await listImages(p.id)).toHaveLength(10)
  })

  it('runPool은 작업 수보다 많은 worker를 만들지 않는다', async () => {
    const done: number[] = []
    await runPool([async () => void done.push(1)], 3)
    expect(done).toEqual([1])
  })
})
