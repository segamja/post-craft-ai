import type { ContentProject, ContentPurpose, ContentTone, UUID } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import { PROJECT_RULES } from '@shared/platformRules'
import { db, projectTables } from '@/lib/db/db'
import { requireProject } from '@/lib/db/rules'
import { newId, nowIso } from '@/lib/db/time'

export type ProjectPatch = Partial<
  Pick<ContentProject, 'title' | 'purpose' | 'purposeDetail' | 'sourceDescription' | 'tone'>
>

function validate(p: Pick<ContentProject, 'purpose' | 'purposeDetail' | 'sourceDescription'>) {
  if (p.purposeDetail !== null && p.purposeDetail.length > PROJECT_RULES.purposeDetailMax)
    throw new AppError('VALIDATION_FAILED', `기타 목적은 ${PROJECT_RULES.purposeDetailMax}자까지 입력할 수 있어요.`)
  if (p.sourceDescription.length > PROJECT_RULES.sourceDescriptionMax)
    throw new AppError('VALIDATION_FAILED', `설명은 ${PROJECT_RULES.sourceDescriptionMax}자까지 입력할 수 있어요.`)
}

/** 'other'는 상세 입력 필수 — 생성 전 검증용 (자동 저장 중에는 비어 있을 수 있어 저장 시엔 강제하지 않는다) */
export const isPurposeComplete = (p: Pick<ContentProject, 'purpose' | 'purposeDetail'>) =>
  p.purpose !== 'other' || (p.purposeDetail?.trim().length ?? 0) > 0

export async function createProject(
  init: { title?: string; purpose?: ContentPurpose; tone?: ContentTone } = {},
): Promise<ContentProject> {
  const now = nowIso()
  const project: ContentProject = {
    id: newId(),
    title: init.title ?? '',
    purpose: init.purpose ?? 'daily',
    purposeDetail: null,
    sourceDescription: '',
    tone: init.tone ?? 'polite',
    language: 'ko',
    status: 'draft',
    imageSetVersion: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.projects.add(project)
  return project
}

export const getProject = (id: UUID) => db.projects.get(id)

export async function listProjects({
  offset = 0,
  limit = 20,
  purpose,
}: { offset?: number; limit?: number; purpose?: ContentPurpose } = {}) {
  let coll = db.projects.orderBy('updatedAt').reverse()
  if (purpose) coll = coll.filter((p) => p.purpose === purpose)
  const [items, total] = await Promise.all([
    coll.clone().offset(offset).limit(limit).toArray(),
    coll.clone().count(),
  ])
  return { items, total }
}

export async function updateProject(id: UUID, patch: ProjectPatch): Promise<ContentProject> {
  return db.transaction('rw', db.projects, async () => {
    const current = await requireProject(id)
    const next: ContentProject = { ...current, ...patch, updatedAt: nowIso() }
    if (next.purpose !== 'other') next.purposeDetail = null
    validate(next)
    await db.projects.put(next)
    return next
  })
}

/** delete_project: 하위 데이터와 이미지 Blob을 모두 삭제 (CASCADE) */
export async function deleteProject(id: UUID): Promise<void> {
  await db.transaction('rw', projectTables(), async () => {
    await requireProject(id)
    const imageIds = (await db.images.where('projectId').equals(id).primaryKeys()) as UUID[]
    await db.imageBlobs.bulkDelete(imageIds)
    await Promise.all([
      db.images.where('projectId').equals(id).delete(),
      db.imageAnalyses.where('projectId').equals(id).delete(),
      db.stories.where('projectId').equals(id).delete(),
      db.platformContents.where('projectId').equals(id).delete(),
      db.platformContentMedia.where('projectId').equals(id).delete(),
      db.carousels.where('projectId').equals(id).delete(),
      db.carouselSlides.where('projectId').equals(id).delete(),
      db.aiJobs.where('projectId').equals(id).delete(),
    ])
    await db.projects.delete(id)
  })
}
