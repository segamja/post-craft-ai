import type { ContentBlock, Platform, PlatformContent, UUID, VerificationItem } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import { PLATFORM_RULES } from '@shared/platformRules'
import { db } from '@/lib/db/db'
import {
  assertBlockImageRefs,
  assertImageRefs,
  assertNotStale,
  dropMissingImageBlocks,
  usableImageIds,
} from '@/lib/db/rules'
import { newId, nowIso } from '@/lib/db/time'

/** 조회용: Facebook 첨부 이미지를 position 순으로 조립 */
export type PlatformContentView = PlatformContent & { mediaImageIds: UUID[] }

export interface PlatformContentInput {
  title: string | null
  blocks: ContentBlock[]
  caption: string | null
  hashtags: string[]
  coverImageId: UUID | null
  mediaImageIds: UUID[]
  verificationItems: VerificationItem[]
}

export type PlatformPatch = Partial<PlatformContentInput>

const tables = () => [db.stories, db.platformContents, db.platformContentMedia, db.images]

const pickInput = (p: PlatformContentView): PlatformContentInput => ({
  title: p.title,
  blocks: p.blocks,
  caption: p.caption,
  hashtags: p.hashtags,
  coverImageId: p.coverImageId,
  mediaImageIds: p.mediaImageIds,
  verificationItems: p.verificationItems,
})

/** 명세 §17.2 platform_contents CHECK 제약 */
function assertShape(platform: Platform, c: PlatformContentInput) {
  const fail = (msg: string) => {
    throw new AppError('VALIDATION_FAILED', msg)
  }
  if (platform !== 'blog' && (c.blocks.length > 0 || c.coverImageId !== null || c.title !== null))
    fail('블록·커버·제목은 Blog 전용입니다.')
  if (platform === 'blog' && c.caption !== null) fail('Blog에는 캡션이 없습니다.')
  if (platform !== 'facebook' && c.mediaImageIds.length > 0) fail('첨부 이미지는 Facebook 전용입니다.')
  if (platform === 'instagram' && (c.caption ?? '').length > PLATFORM_RULES.instagram.captionMax)
    fail(`Instagram 캡션은 ${PLATFORM_RULES.instagram.captionMax}자까지입니다.`)
  if (c.hashtags.length > PLATFORM_RULES[platform].hashtagsMax)
    fail(`해시태그는 ${PLATFORM_RULES[platform].hashtagsMax}개까지입니다.`)
  if (platform === 'facebook' && c.mediaImageIds.length > PLATFORM_RULES.facebook.mediaMax)
    fail(`첨부 이미지는 ${PLATFORM_RULES.facebook.mediaMax}장까지입니다.`)
}

async function assertRefs(projectId: UUID, c: PlatformContentInput) {
  await assertBlockImageRefs(projectId, c.blocks)
  await assertImageRefs(projectId, [c.coverImageId, ...c.mediaImageIds])
}

async function withMedia(p: PlatformContent): Promise<PlatformContentView> {
  const media = await db.platformContentMedia.where('platformContentId').equals(p.id).toArray()
  return { ...p, mediaImageIds: media.sort((a, b) => a.position - b.position).map((m) => m.imageId) }
}

async function writeMedia(p: PlatformContent, mediaImageIds: UUID[]) {
  await db.platformContentMedia.where('platformContentId').equals(p.id).delete()
  await db.platformContentMedia.bulkAdd(
    mediaImageIds.map((imageId, position) => ({ platformContentId: p.id, projectId: p.projectId, imageId, position })),
  )
}

function splitView(v: PlatformContentView): PlatformContent {
  const { mediaImageIds: _omit, ...row } = v
  return row
}

export async function listPlatformContents(projectId: UUID): Promise<PlatformContentView[]> {
  const rows = await db.platformContents.where('projectId').equals(projectId).toArray()
  return Promise.all(rows.map(withMedia))
}

export async function getPlatformContent(projectId: UUID, platform: Platform) {
  const row = await db.platformContents.where('[projectId+platform]').equals([projectId, platform]).first()
  return row ? withMedia(row) : undefined
}

/** AI 생성 결과 저장. sourceStoryVersion = 현재 Story version */
export async function writeAiPlatform(
  projectId: UUID,
  platform: Platform,
  input: PlatformContentInput,
): Promise<PlatformContentView> {
  return db.transaction('rw', tables(), async () => {
    const story = await db.stories.where('projectId').equals(projectId).first()
    if (!story) throw new AppError('NOT_FOUND', 'Story를 먼저 생성해야 합니다.')
    assertShape(platform, input)
    await assertRefs(projectId, input)
    const cur = await getPlatformContent(projectId, platform)
    const now = nowIso()
    const next: PlatformContentView = {
      id: cur?.id ?? newId(),
      projectId,
      platform,
      ...input,
      sourceStoryVersion: story.version,
      previousSnapshot: cur ? { ...pickInput(cur) } : null,
      aiGeneratedAt: now,
      userEditedAt: null,
      createdAt: cur?.createdAt ?? now,
      updatedAt: now,
    }
    await db.platformContents.put(splitView(next))
    await writeMedia(next, input.mediaImageIds)
    return next
  })
}

export async function savePlatformEdit(
  id: UUID,
  patch: PlatformPatch,
  lastKnownUpdatedAt: string,
): Promise<PlatformContentView> {
  return db.transaction('rw', tables(), async () => {
    const row = await db.platformContents.get(id)
    if (!row) throw new AppError('NOT_FOUND')
    assertNotStale(row, lastKnownUpdatedAt)
    const cur = await withMedia(row)
    const input = { ...pickInput(cur), ...patch }
    assertShape(cur.platform, input)
    await assertRefs(cur.projectId, input)
    const now = nowIso()
    const next: PlatformContentView = { ...cur, ...input, userEditedAt: now, updatedAt: now }
    await db.platformContents.put(splitView(next))
    if (patch.mediaImageIds) await writeMedia(next, input.mediaImageIds)
    return next
  })
}

export async function revertPlatform(id: UUID): Promise<PlatformContentView> {
  return db.transaction('rw', tables(), async () => {
    const row = await db.platformContents.get(id)
    if (!row?.previousSnapshot) throw new AppError('NOT_FOUND')
    const snap = row.previousSnapshot as unknown as PlatformContentInput
    const usable = await usableImageIds(row.projectId)
    const input: PlatformContentInput = {
      ...snap,
      blocks: dropMissingImageBlocks(snap.blocks, usable),
      coverImageId: snap.coverImageId && usable.has(snap.coverImageId) ? snap.coverImageId : null,
      mediaImageIds: snap.mediaImageIds.filter((x) => usable.has(x)),
    }
    const now = nowIso()
    const next: PlatformContentView = { ...row, ...input, previousSnapshot: null, userEditedAt: now, updatedAt: now }
    await db.platformContents.put(splitView(next))
    await writeMedia(next, input.mediaImageIds)
    return next
  })
}
