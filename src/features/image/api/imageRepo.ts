import type { UnsplashInfo, UserImage, UUID } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import { IMAGE_RULES } from '@shared/platformRules'
import { db } from '@/lib/db/db'
import {
  assertImageCapacity,
  blocksReplaceImage,
  bumpImageSetVersion,
  compactPositions,
  listPositionedImages,
  requireProject,
} from '@/lib/db/rules'
import { newId, nowIso } from '@/lib/db/time'

// 이미지 생명주기 (명세 §8). 삭제·교체·정렬은 명세의 RPC와 같은 의미를 하나의 트랜잭션으로 처리한다.

const imageTables = () => [
  db.projects,
  db.images,
  db.imageBlobs,
  db.imageAnalyses,
  db.stories,
  db.platformContents,
  db.platformContentMedia,
  db.carouselSlides,
]

function baseImage(projectId: UUID, position: number | null, now: string): UserImage {
  return {
    id: newId(),
    projectId,
    position,
    source: 'upload',
    status: 'pending',
    fileName: null,
    mimeType: null,
    width: null,
    height: null,
    byteSize: null,
    altText: null,
    unsplash: null,
    createdAt: now,
    updatedAt: now,
  }
}

export const listImages = (projectId: UUID) => listPositionedImages(projectId)
export const getImageBlob = async (id: UUID) => (await db.imageBlobs.get(id))?.blob ?? null

/** §8.2 1~2: 선택 순서대로 id와 position을 예약하고 pending 행을 만든다 */
export async function reserveUploads(projectId: UUID, files: { fileName: string }[]): Promise<UserImage[]> {
  return db.transaction('rw', db.projects, db.images, async () => {
    await requireProject(projectId)
    await assertImageCapacity(projectId, files.length, IMAGE_RULES.maxPerProject)
    const start = (await listPositionedImages(projectId)).length
    const now = nowIso()
    const rows = files.map((f, i) => ({ ...baseImage(projectId, start + i, now), fileName: f.fileName }))
    await db.images.bulkAdd(rows)
    return rows
  })
}

/** §8.5 1: 교체용 이미지 (position = null, 목록에 표시하지 않음) */
export async function reserveReplacement(projectId: UUID, fileName: string): Promise<UserImage> {
  return db.transaction('rw', db.projects, db.images, async () => {
    await requireProject(projectId)
    const row = { ...baseImage(projectId, null, nowIso()), fileName }
    await db.images.add(row)
    return row
  })
}

/** §8.2 4~5: 전처리된 JPEG 저장 → ready, 표시 중인 이미지면 imageSetVersion +1 */
export async function completeUpload(
  id: UUID,
  file: { blob: Blob; width: number; height: number },
): Promise<void> {
  await db.transaction('rw', db.projects, db.images, db.imageBlobs, async () => {
    const img = await db.images.get(id)
    if (!img) throw new AppError('NOT_FOUND')
    if (img.status === 'ready') return
    await db.imageBlobs.put({ id, blob: file.blob })
    await db.images.update(id, {
      status: 'ready',
      mimeType: file.blob.type || 'image/jpeg',
      width: file.width,
      height: file.height,
      byteSize: file.blob.size,
      updatedAt: nowIso(),
    })
    if (img.position !== null) await bumpImageSetVersion(img.projectId)
  })
}

export async function failUpload(id: UUID): Promise<void> {
  await db.images.update(id, { status: 'failed', updatedAt: nowIso() })
}

/** 실패한 업로드를 다시 시도하기 전 pending으로 되돌린다 */
export async function markPending(id: UUID): Promise<void> {
  await db.images.where('id').equals(id).filter((i) => i.status === 'failed').modify({
    status: 'pending',
    updatedAt: nowIso(),
  })
}

/** §8.6: Unsplash는 Blob 없이 hotlink, 추가 즉시 ready */
export async function addUnsplashImage(projectId: UUID, info: UnsplashInfo, altText: string | null = null) {
  return db.transaction('rw', db.projects, db.images, async () => {
    await requireProject(projectId)
    await assertImageCapacity(projectId, 1, IMAGE_RULES.maxPerProject)
    const position = (await listPositionedImages(projectId)).length
    const row: UserImage = {
      ...baseImage(projectId, position, nowIso()),
      source: 'unsplash',
      status: 'ready',
      altText,
      unsplash: info,
    }
    await db.images.add(row)
    await bumpImageSetVersion(projectId)
    return row
  })
}

export async function updateAltText(id: UUID, altText: string | null): Promise<void> {
  await db.images.update(id, { altText, updatedAt: nowIso() })
}

/** Story / Blog blocks 갱신. 내용이 바뀌면 Story version +1 (bump_story_version) */
async function rewriteBlocks(projectId: UUID, oldId: UUID, newId: UUID | null) {
  const now = nowIso()
  await db.stories
    .where('projectId')
    .equals(projectId)
    .modify((s) => {
      const next = blocksReplaceImage(s.blocks, oldId, newId)
      if (JSON.stringify(next) === JSON.stringify(s.blocks)) return
      s.blocks = next
      s.version += 1
      s.updatedAt = now
    })
  await db.platformContents
    .where('projectId')
    .equals(projectId)
    .modify((p) => {
      if (p.platform !== 'blog') return
      const next = blocksReplaceImage(p.blocks, oldId, newId)
      if (JSON.stringify(next) === JSON.stringify(p.blocks)) return
      p.blocks = next
      p.updatedAt = now
    })
}

/** RPC delete_image (§8.3) */
export async function deleteImage(id: UUID): Promise<void> {
  await db.transaction('rw', imageTables(), async () => {
    const img = await db.images.get(id)
    if (!img) throw new AppError('NOT_FOUND')
    const { projectId } = img
    const now = nowIso()

    await rewriteBlocks(projectId, id, null)
    // FK 동작: cover → null, slide → null, facebook media → 삭제, analysis → 삭제
    await db.platformContents
      .where('projectId')
      .equals(projectId)
      .modify((p) => {
        if (p.coverImageId === id) {
          p.coverImageId = null
          p.updatedAt = now
        }
      })
    await db.carouselSlides.where('imageId').equals(id).modify({ imageId: null })
    await db.platformContentMedia.where('imageId').equals(id).delete()
    await db.imageAnalyses.delete(id)
    await db.imageBlobs.delete(id)
    await db.images.delete(id)

    await compactPositions(projectId)
    // 사진 구성에 반영됐던(ready + 표시 중) 이미지가 빠질 때만 버전 증가
    if (img.status === 'ready' && img.position !== null) await bumpImageSetVersion(projectId)
  })
}

/** RPC reorder_images (§8.4): position만 바꾸고 imageSetVersion은 그대로 */
export async function reorderImages(projectId: UUID, orderedIds: UUID[]): Promise<void> {
  await db.transaction('rw', db.projects, db.images, async () => {
    await requireProject(projectId)
    const current = (await listPositionedImages(projectId)).map((i) => i.id).sort()
    const requested = [...orderedIds].sort()
    if (current.length !== requested.length || current.some((x, i) => x !== requested[i]))
      throw new AppError('IMAGE_SET_MISMATCH')
    const now = nowIso()
    await Promise.all(orderedIds.map((imgId, i) => db.images.update(imgId, { position: i, updatedAt: now })))
  })
}

/** RPC replace_image (§8.5) */
export async function replaceImage(oldId: UUID, newImageId: UUID): Promise<void> {
  await db.transaction('rw', imageTables(), async () => {
    const [oldImg, newImg] = await db.images.bulkGet([oldId, newImageId])
    if (!oldImg || !newImg || oldImg.projectId !== newImg.projectId) throw new AppError('NOT_FOUND')
    if (newImg.status !== 'ready' || newImg.position !== null) throw new AppError('INVALID_REPLACEMENT')
    const { projectId } = oldImg
    const now = nowIso()

    await db.images.update(newImageId, { position: oldImg.position, updatedAt: now })
    await rewriteBlocks(projectId, oldId, newImageId)
    await db.platformContents
      .where('projectId')
      .equals(projectId)
      .modify((p) => {
        if (p.coverImageId === oldId) {
          p.coverImageId = newImageId
          p.updatedAt = now
        }
      })
    await db.carouselSlides.where('imageId').equals(oldId).modify({ imageId: newImageId })
    const media = await db.platformContentMedia.where('imageId').equals(oldId).toArray()
    await db.platformContentMedia.where('imageId').equals(oldId).delete()
    await db.platformContentMedia.bulkAdd(media.map((m) => ({ ...m, imageId: newImageId })))

    await db.imageAnalyses.delete(oldId)
    await db.imageBlobs.delete(oldId)
    await db.images.delete(oldId)
    await bumpImageSetVersion(projectId)
  })
}

/** 정리 작업 (명세 §17.7 2): 24시간 이상 지난 pending/failed 이미지 삭제. 앱 시작 시 호출 */
export async function cleanupStaleUploads(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString()
  const stale = await db.images.filter((i) => i.status !== 'ready' && i.updatedAt < cutoff).toArray()
  for (const img of stale) await deleteImage(img.id)
  return stale.length
}
