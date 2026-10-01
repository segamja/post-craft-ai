import type { ContentBlock, UUID, UserImage } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import { db } from './db'
import { nowIso } from './time'

// 명세 §17.3 트리거와 §7.3 참조 무결성을 대신하는 규칙.
// 모두 db.transaction('rw', …) 안에서 호출해야 원자성이 보장된다.

/** 프로젝트의 표시 중인 이미지(position != null)를 position 순으로 */
export async function listPositionedImages(projectId: UUID): Promise<UserImage[]> {
  const rows = await db.images.where('projectId').equals(projectId).toArray()
  return rows.filter((i) => i.position !== null).sort((a, b) => a.position! - b.position!)
}

/** blocks 내 image 블록 교체(newId) 또는 제거(newId = null) — blocks_replace_image */
export function blocksReplaceImage(blocks: ContentBlock[], oldId: UUID, newId: UUID | null): ContentBlock[] {
  return blocks.flatMap((b) => {
    if (b.type !== 'image' || b.imageId !== oldId) return [b]
    return newId === null ? [] : [{ ...b, imageId: newId }]
  })
}

/** 같은 프로젝트의 ready·표시 중 이미지만 참조 허용 — validate_block_image_refs */
export async function assertBlockImageRefs(projectId: UUID, blocks: ContentBlock[]): Promise<void> {
  const ids = blocks.flatMap((b) => (b.type === 'image' ? [b.imageId] : []))
  await assertImageRefs(projectId, ids, { requireReady: true })
}

/** 복합 FK (image_id, project_id) 대체 */
export async function assertImageRefs(
  projectId: UUID,
  imageIds: (UUID | null)[],
  { requireReady = false } = {},
): Promise<void> {
  const ids = [...new Set(imageIds.filter((x): x is UUID => x !== null))]
  if (ids.length === 0) return
  const rows = await db.images.bulkGet(ids)
  const bad = rows.some(
    (r) => !r || r.projectId !== projectId || (requireReady && (r.status !== 'ready' || r.position === null)),
  )
  if (bad) throw new AppError('INVALID_IMAGE_REF')
}

/** 사용할 수 있는(같은 프로젝트·ready·표시 중) 이미지 id 집합 */
export async function usableImageIds(projectId: UUID): Promise<Set<UUID>> {
  return new Set(
    (await listPositionedImages(projectId)).filter((i) => i.status === 'ready').map((i) => i.id),
  )
}

/** 되돌리기 등으로 오래된 내용을 복원할 때, 이미 사라진 이미지 참조를 정리한다 */
export function dropMissingImageBlocks(blocks: ContentBlock[], usable: Set<UUID>): ContentBlock[] {
  return blocks.filter((b) => b.type !== 'image' || usable.has(b.imageId))
}

/** 프로젝트당 장수 제한 — enforce_image_limit */
export async function assertImageCapacity(projectId: UUID, adding: number, max: number): Promise<void> {
  const current = (await listPositionedImages(projectId)).length
  if (current + adding > max) throw new AppError('IMAGE_LIMIT_EXCEEDED')
}

/** 남은 이미지 position을 0..n-1로 재정렬 */
export async function compactPositions(projectId: UUID): Promise<void> {
  const rows = await listPositionedImages(projectId)
  const now = nowIso()
  await Promise.all(
    rows.map((r, i) => (r.position === i ? undefined : db.images.update(r.id, { position: i, updatedAt: now }))),
  )
}

export async function bumpImageSetVersion(projectId: UUID): Promise<void> {
  await db.projects
    .where('id')
    .equals(projectId)
    .modify((p) => {
      p.imageSetVersion += 1
      p.updatedAt = nowIso()
    })
}

export async function requireProject(projectId: UUID) {
  const p = await db.projects.get(projectId)
  if (!p) throw new AppError('NOT_FOUND')
  return p
}

/** 낙관적 잠금 (명세 §12.5) */
export function assertNotStale(current: { updatedAt: string }, lastKnownUpdatedAt: string): void {
  if (current.updatedAt !== lastKnownUpdatedAt) throw new AppError('CONFLICT')
}
