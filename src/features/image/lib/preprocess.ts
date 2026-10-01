import { AppError, type ErrorCode } from '@shared/errorCodes'
import { IMAGE_RULES } from '@shared/platformRules'

// 업로드 전 전처리 (명세 §8.1, D-10)
// HEIC→JPEG 변환 → EXIF 방향 적용 → 긴 변 2048px 리사이즈 → JPEG 0.85 재인코딩.
// 캔버스로 다시 그리기 때문에 GPS를 포함한 모든 메타데이터가 사라진다.

export interface PreprocessResult {
  blob: Blob
  width: number
  height: number
}

const EXT_OK = /\.(jpe?g|png|webp|heic|heif)$/i

/** Windows 등에서 .heic 파일의 type이 비어 있는 경우가 있어 확장자도 본다 */
export const isHeic = (file: Pick<File, 'type' | 'name'>) =>
  /^image\/hei[cf]$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)

export function validateFile(file: Pick<File, 'type' | 'name' | 'size'>): ErrorCode | null {
  const typeOk = (IMAGE_RULES.acceptedMimeTypes as readonly string[]).includes(file.type.toLowerCase())
  if (!typeOk && !(file.type === '' && EXT_OK.test(file.name))) return 'UNSUPPORTED_FILE'
  if (file.size > IMAGE_RULES.maxOriginalBytes) return 'FILE_TOO_LARGE'
  return null
}

/** 비율을 유지하며 긴 변이 max를 넘지 않게 (확대하지 않음) */
export function fitWithin(width: number, height: number, max: number = IMAGE_RULES.resizeLongEdge) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function toDecodable(file: File): Promise<Blob> {
  if (!isHeic(file)) return file
  const { default: heic2any } = await import('heic2any')
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  return Array.isArray(out) ? out[0]! : out
}

/** 이미 저장된 JPEG를 더 작게 다시 인코딩 (AI 분석 전송용) */
export async function shrinkJpeg(blob: Blob, longEdge: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, longEdge)
    return await encodeJpeg(bitmap, width, height, quality)
  } finally {
    bitmap.close()
  }
}

async function encodeJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number = IMAGE_RULES.jpegQuality,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // PNG 투명 영역이 검게 나오지 않도록
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality),
  )
}

export async function preprocessImage(file: File): Promise<PreprocessResult> {
  const invalid = validateFile(file)
  if (invalid) throw new AppError(invalid)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(await toDecodable(file), { imageOrientation: 'from-image' })
  } catch {
    throw new AppError('UNSUPPORTED_FILE', '사진을 읽을 수 없습니다.')
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const blob = await encodeJpeg(bitmap, width, height)
    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}
