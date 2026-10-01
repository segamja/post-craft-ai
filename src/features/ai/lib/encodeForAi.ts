import type { UserImage } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import type { AiImageInputT } from '@shared/schemas/api'
import { getImageBlob } from '@/features/image/api/imageRepo'
import { shrinkJpeg } from '@/features/image/lib/preprocess'

// 분석용 이미지 준비 (명세 §10.5 로컬 DB 버전)
// 업로드 사진: 긴 변 1024px JPEG data URL (Vercel 요청 한도 4.5MB 안쪽, 비용 절감)
// Unsplash: 중간 크기 hotlink URL

const AI_LONG_EDGE = 1024
const AI_JPEG_QUALITY = 0.8

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export type EncodeForAi = (image: UserImage) => Promise<AiImageInputT>

export const encodeForAi: EncodeForAi = async (image) => {
  if (image.source === 'unsplash') {
    if (!image.unsplash) throw new AppError('NOT_FOUND')
    const url = new URL(image.unsplash.externalUrl)
    url.searchParams.set('w', String(AI_LONG_EDGE))
    return { url: url.toString() }
  }
  const blob = await getImageBlob(image.id)
  if (!blob) throw new AppError('NOT_FOUND', '사진 파일을 찾을 수 없습니다.')
  return { dataUrl: await blobToDataUrl(await shrinkJpeg(blob, AI_LONG_EDGE, AI_JPEG_QUALITY)) }
}
