import type { UUID } from '@shared/domain'
import { AppError, isAppError, type ErrorCode } from '@shared/errorCodes'
import { IMAGE_RULES } from '@shared/platformRules'
import {
  completeUpload,
  deleteImage,
  failUpload,
  listImages,
  markPending,
  replaceImage,
  reserveReplacement,
  reserveUploads,
} from '../api/imageRepo'
import { preprocessImage, validateFile, type PreprocessResult } from './preprocess'

// 업로드 파이프라인 (명세 §8.2). 선택 순서대로 position을 예약하고, 최대 3개씩 병렬 처리한다.
// 완료 순서와 관계없이 position은 선택 순서를 따르며, 한 장의 실패가 다른 장을 막지 않는다.

export interface UploadOptions {
  preprocess?: (file: File) => Promise<PreprocessResult>
  concurrency?: number
  /** 예약된 이미지 id ↔ 원본 File (재시도용, 메모리에만 보관) */
  onReserved?: (id: UUID, file: File) => void
  onFailed?: (id: UUID, code: ErrorCode) => void
  onSucceeded?: (id: UUID) => void
}

export interface UploadResult {
  reserved: UUID[]
  /** 형식·크기 검사에서 걸러진 파일 */
  rejected: { file: File; code: ErrorCode }[]
  /** 10장 제한 때문에 추가하지 못한 파일 */
  overflow: File[]
}

export async function runPool(tasks: (() => Promise<void>)[], concurrency: number): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < tasks.length) await tasks[next++]!()
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
}

async function processOne(id: UUID, file: File, opts: UploadOptions) {
  const preprocess = opts.preprocess ?? preprocessImage
  try {
    await completeUpload(id, await preprocess(file))
    opts.onSucceeded?.(id)
  } catch (e) {
    await failUpload(id)
    opts.onFailed?.(id, isAppError(e) ? e.code : 'UNSUPPORTED_FILE')
  }
}

export async function uploadFiles(projectId: UUID, files: File[], opts: UploadOptions = {}): Promise<UploadResult> {
  const rejected: UploadResult['rejected'] = []
  const valid: File[] = []
  for (const file of files) {
    const code = validateFile(file)
    if (code) rejected.push({ file, code })
    else valid.push(file)
  }

  const remaining = IMAGE_RULES.maxPerProject - (await listImages(projectId)).length
  const accepted = valid.slice(0, Math.max(0, remaining))
  const overflow = valid.slice(accepted.length)
  if (accepted.length === 0) return { reserved: [], rejected, overflow }

  const rows = await reserveUploads(projectId, accepted.map((f) => ({ fileName: f.name })))
  rows.forEach((r, i) => opts.onReserved?.(r.id, accepted[i]!))

  await runPool(
    rows.map((r, i) => () => processOne(r.id, accepted[i]!, opts)),
    opts.concurrency ?? IMAGE_RULES.uploadConcurrency,
  )
  return { reserved: rows.map((r) => r.id), rejected, overflow }
}

/**
 * 교체 (명세 §8.5): 새 이미지를 position=null로 만들어 처리한 뒤 replace_image로 같은 자리에 넣는다.
 * 실패하면 교체용 행을 지우고 기존 이미지는 그대로 둔다.
 */
export async function replaceWithFile(
  oldId: UUID,
  projectId: UUID,
  file: File,
  opts: Pick<UploadOptions, 'preprocess'> = {},
): Promise<UUID> {
  const code = validateFile(file)
  if (code) throw new AppError(code)
  const row = await reserveReplacement(projectId, file.name)
  try {
    await completeUpload(row.id, await (opts.preprocess ?? preprocessImage)(file))
    await replaceImage(oldId, row.id)
    return row.id
  } catch (e) {
    await deleteImage(row.id).catch(() => {})
    throw e
  }
}

/** 실패한 이미지를 같은 자리(id·position 유지)에서 다시 처리 */
export async function retryUpload(id: UUID, file: File, opts: UploadOptions = {}): Promise<void> {
  await markPending(id)
  await processOne(id, file, opts)
}
