import type { ImageAnalysis, UserImage, UUID } from '@shared/domain'
import type { ImageAnalysisOutT } from '@shared/schemas/ai'
import { db } from '@/lib/db/db'
import { listPositionedImages } from '@/lib/db/rules'
import { nowIso } from '@/lib/db/time'

// 사진 분석 결과 저장·재사용 (명세 §6.6, §10.2 [1]: 분석 없는 이미지만 분석)

export async function listAnalyses(projectId: UUID): Promise<Map<UUID, ImageAnalysis>> {
  const rows = await db.imageAnalyses.where('projectId').equals(projectId).toArray()
  return new Map(rows.map((r) => [r.imageId, r]))
}

/** 분석 대상: 표시 중이고 ready인데 분석이 없는 이미지 */
export async function listUnanalyzedImages(projectId: UUID): Promise<UserImage[]> {
  const [images, analyses] = await Promise.all([listPositionedImages(projectId), listAnalyses(projectId)])
  return images.filter((i) => i.status === 'ready' && !analyses.has(i.id))
}

/** 분석하는 동안 사진이 삭제·교체됐으면 저장하지 않는다 */
export async function saveAnalysis(imageId: UUID, out: ImageAnalysisOutT, model: string): Promise<boolean> {
  return db.transaction('rw', db.images, db.imageAnalyses, async () => {
    const img = await db.images.get(imageId)
    if (!img || img.status !== 'ready') return false
    await db.imageAnalyses.put({ imageId, projectId: img.projectId, ...out, model, analyzedAt: nowIso() })
    return true
  })
}

/** 대체 텍스트: 사용자 값 → 분석의 suggestedAlt → "사진 n" (명세 §23) */
export const resolveAltText = (image: Pick<UserImage, 'altText'>, analysis: ImageAnalysis | undefined, index: number) =>
  image.altText?.trim() || analysis?.suggestedAlt || `사진 ${index + 1}`
