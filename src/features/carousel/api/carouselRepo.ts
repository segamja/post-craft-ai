import type { CarouselContent, CarouselSlide, UUID } from '@shared/domain'
import { AppError } from '@shared/errorCodes'
import { CAROUSEL_RULES } from '@shared/platformRules'
import { db } from '@/lib/db/db'
import { assertImageRefs, assertNotStale, usableImageIds } from '@/lib/db/rules'
import { newId, nowIso } from '@/lib/db/time'

export interface SlideInput {
  /** 기존 슬라이드를 유지할 때 그 id. 없으면 새로 만든다 */
  id?: UUID
  imageId: UUID | null
  title: string
  body: string
}

export type CarouselView = CarouselContent & { slides: CarouselSlide[] }

const tables = () => [db.platformContents, db.carousels, db.carouselSlides, db.images]

function assertSlides(slides: SlideInput[]) {
  const fail = (msg: string) => {
    throw new AppError('VALIDATION_FAILED', msg)
  }
  if (slides.length < CAROUSEL_RULES.slidesMin || slides.length > CAROUSEL_RULES.slidesMax)
    fail(`슬라이드는 ${CAROUSEL_RULES.slidesMin}~${CAROUSEL_RULES.slidesMax}장이어야 합니다.`)
  for (const s of slides) {
    if (s.title.length > CAROUSEL_RULES.titleMax) fail(`슬라이드 제목은 ${CAROUSEL_RULES.titleMax}자까지입니다.`)
    if (s.body.length > CAROUSEL_RULES.bodyMax) fail(`슬라이드 본문은 ${CAROUSEL_RULES.bodyMax}자까지입니다.`)
  }
}

async function slidesOf(carouselId: UUID) {
  const rows = await db.carouselSlides.where('carouselId').equals(carouselId).toArray()
  return rows.sort((a, b) => a.position - b.position)
}

/** 슬라이드 전체를 주어진 순서로 다시 쓴다 (순서 = position) */
async function writeSlides(c: CarouselContent, slides: SlideInput[]) {
  await db.carouselSlides.where('carouselId').equals(c.id).delete()
  await db.carouselSlides.bulkAdd(
    slides.map((s, position) => ({
      id: s.id ?? newId(),
      carouselId: c.id,
      projectId: c.projectId,
      position,
      imageId: s.imageId,
      title: s.title,
      body: s.body,
    })),
  )
}

const toInput = (slides: CarouselSlide[]): SlideInput[] =>
  slides.map(({ id, imageId, title, body }) => ({ id, imageId, title, body }))

export async function getCarousel(projectId: UUID): Promise<CarouselView | undefined> {
  const c = await db.carousels.where('projectId').equals(projectId).first()
  return c ? { ...c, slides: await slidesOf(c.id) } : undefined
}

/** AI 생성 결과 저장. Instagram 콘텐츠가 있어야 한다 (validate_carousel_platform) */
export async function writeAiCarousel(projectId: UUID, slides: SlideInput[]): Promise<CarouselView> {
  return db.transaction('rw', tables(), async () => {
    const ig = await db.platformContents.where('[projectId+platform]').equals([projectId, 'instagram']).first()
    if (!ig) throw new AppError('CAROUSEL_INSTAGRAM_ONLY')
    assertSlides(slides)
    await assertImageRefs(projectId, slides.map((s) => s.imageId))
    const cur = await getCarousel(projectId)
    const now = nowIso()
    const c: CarouselContent = {
      id: cur?.id ?? newId(),
      projectId,
      platformContentId: ig.id,
      previousSnapshot: cur ? { slides: toInput(cur.slides) } : null,
      aiGeneratedAt: now,
      userEditedAt: null,
      createdAt: cur?.createdAt ?? now,
      updatedAt: now,
    }
    await db.carousels.put(c)
    await writeSlides(c, slides.map(({ id: _id, ...s }) => s))
    return { ...c, slides: await slidesOf(c.id) }
  })
}

/** 사용자 편집: 순서 변경·추가·삭제·텍스트/이미지 수정을 슬라이드 전체 목록으로 저장 */
export async function saveCarouselEdit(
  carouselId: UUID,
  slides: SlideInput[],
  lastKnownUpdatedAt: string,
): Promise<CarouselView> {
  return db.transaction('rw', tables(), async () => {
    const cur = await db.carousels.get(carouselId)
    if (!cur) throw new AppError('NOT_FOUND')
    assertNotStale(cur, lastKnownUpdatedAt)
    assertSlides(slides)
    await assertImageRefs(cur.projectId, slides.map((s) => s.imageId))
    const now = nowIso()
    const next = { ...cur, userEditedAt: now, updatedAt: now }
    await db.carousels.put(next)
    await writeSlides(next, slides)
    return { ...next, slides: await slidesOf(next.id) }
  })
}

export async function revertCarousel(carouselId: UUID): Promise<CarouselView> {
  return db.transaction('rw', tables(), async () => {
    const cur = await db.carousels.get(carouselId)
    if (!cur?.previousSnapshot) throw new AppError('NOT_FOUND')
    const usable = await usableImageIds(cur.projectId)
    const slides = (cur.previousSnapshot.slides as SlideInput[]).map((s) => ({
      ...s,
      imageId: s.imageId && usable.has(s.imageId) ? s.imageId : null,
    }))
    const now = nowIso()
    const next = { ...cur, previousSnapshot: null, userEditedAt: now, updatedAt: now }
    await db.carousels.put(next)
    await writeSlides(next, slides)
    return { ...next, slides: await slidesOf(next.id) }
  })
}
