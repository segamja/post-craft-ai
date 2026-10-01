import type { ContentBlock, ContentStory, UUID, VerificationItem } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import { db } from '@/lib/db/db'
import {
  assertBlockImageRefs,
  assertNotStale,
  dropMissingImageBlocks,
  requireProject,
  usableImageIds,
} from '@/lib/db/rules'
import { newId, nowIso } from '@/lib/db/time'

export type StoryPatch = Partial<Pick<ContentStory, 'title' | 'summary' | 'blocks' | 'verificationItems'>>

export interface StoryContent {
  title: string
  summary: string
  blocks: ContentBlock[]
  verificationItems: VerificationItem[]
}

const pickContent = (s: ContentStory): StoryContent => ({
  title: s.title,
  summary: s.summary,
  blocks: s.blocks,
  verificationItems: s.verificationItems,
})

/** bump_story_version: title/summary/blocks가 바뀔 때만 version +1 */
const contentChanged = (a: StoryContent, b: StoryContent) =>
  a.title !== b.title || a.summary !== b.summary || JSON.stringify(a.blocks) !== JSON.stringify(b.blocks)

export const getStory = (projectId: UUID) => db.stories.where('projectId').equals(projectId).first()

/** 사용자 편집 (자동 저장). 0행 갱신 대신 CONFLICT를 던진다. */
export async function saveStoryEdit(id: UUID, patch: StoryPatch, lastKnownUpdatedAt: string): Promise<ContentStory> {
  return db.transaction('rw', db.stories, db.images, async () => {
    const cur = await db.stories.get(id)
    if (!cur) throw new AppError('NOT_FOUND')
    assertNotStale(cur, lastKnownUpdatedAt)
    const next: ContentStory = { ...cur, ...patch }
    if (patch.blocks) await assertBlockImageRefs(cur.projectId, patch.blocks)
    if (contentChanged(pickContent(cur), pickContent(next))) next.version = cur.version + 1
    const now = nowIso()
    next.userEditedAt = now
    next.updatedAt = now
    await db.stories.put(next)
    return next
  })
}

/** AI 생성·재생성 결과 저장 (명세 §9.2, §9.5). blocks는 별칭 매핑이 끝난 상태여야 한다. */
export async function writeAiStory(projectId: UUID, content: StoryContent): Promise<ContentStory> {
  return db.transaction('rw', db.projects, db.stories, db.images, async () => {
    const project = await requireProject(projectId)
    await assertBlockImageRefs(projectId, content.blocks)
    const cur = await getStory(projectId)
    const now = nowIso()
    const next: ContentStory = {
      id: cur?.id ?? newId(),
      projectId,
      ...content,
      version: cur ? (contentChanged(pickContent(cur), content) ? cur.version + 1 : cur.version) : 1,
      sourceImageSetVersion: project.imageSetVersion,
      previousSnapshot: cur ? { ...pickContent(cur) } : null,
      aiGeneratedAt: now,
      userEditedAt: null,
      createdAt: cur?.createdAt ?? now,
      updatedAt: now,
    }
    await db.stories.put(next)
    if (project.status !== 'generated') await db.projects.update(projectId, { status: 'generated', updatedAt: now })
    return next
  })
}

/** 직전 1개 스냅샷으로 되돌리기 */
export async function revertStory(id: UUID): Promise<ContentStory> {
  return db.transaction('rw', db.stories, db.images, async () => {
    const cur = await db.stories.get(id)
    if (!cur?.previousSnapshot) throw new AppError('NOT_FOUND')
    const snap = cur.previousSnapshot as unknown as StoryContent
    const restored: StoryContent = {
      ...snap,
      blocks: dropMissingImageBlocks(snap.blocks, await usableImageIds(cur.projectId)),
    }
    const now = nowIso()
    const next: ContentStory = {
      ...cur,
      ...restored,
      version: contentChanged(pickContent(cur), restored) ? cur.version + 1 : cur.version,
      previousSnapshot: null,
      userEditedAt: now,
      updatedAt: now,
    }
    await db.stories.put(next)
    return next
  })
}
