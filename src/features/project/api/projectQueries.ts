import type { ContentProject, ContentPurpose, UserImage, UUID } from '@shared/domain'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/db'
import { listPositionedImages } from '@/lib/db/rules'
import { listProjects } from './projectRepo'

// 조회 hook. 로컬 DB는 Dexie liveQuery로 읽어 다른 탭의 변경까지 자동 반영한다.

export type ContentKind = 'story' | 'blog' | 'instagram' | 'facebook' | 'carousel'

export interface ProjectSummary {
  project: ContentProject
  imageCount: number
  cover: UserImage | null
  contents: ContentKind[]
}

const KIND_ORDER: ContentKind[] = ['story', 'blog', 'instagram', 'facebook', 'carousel']

async function summarize(project: ContentProject): Promise<ProjectSummary> {
  const [images, hasStory, platforms, hasCarousel] = await Promise.all([
    listPositionedImages(project.id),
    db.stories.where('projectId').equals(project.id).count(),
    db.platformContents.where('projectId').equals(project.id).toArray(),
    db.carousels.where('projectId').equals(project.id).count(),
  ])
  const kinds = new Set<ContentKind>(platforms.map((p) => p.platform))
  if (hasStory) kinds.add('story')
  if (hasCarousel) kinds.add('carousel')
  const ready = images.filter((i) => i.status === 'ready')
  return {
    project,
    imageCount: images.length,
    cover: ready[0] ?? null,
    contents: KIND_ORDER.filter((k) => kinds.has(k)),
  }
}

export function useProjectSummaries(opts: { offset?: number; limit?: number; purpose?: ContentPurpose }) {
  return useLiveQuery(async () => {
    const { items, total } = await listProjects(opts)
    return { items: await Promise.all(items.map(summarize)), total }
  }, [opts.offset, opts.limit, opts.purpose])
}

/** 목적별 프로젝트 수 (필터 칩) */
export function usePurposeCounts() {
  return useLiveQuery(async () => {
    const keys = (await db.projects.orderBy('purpose').keys()) as ContentPurpose[]
    const counts: Partial<Record<ContentPurpose, number>> = {}
    for (const k of keys) counts[k] = (counts[k] ?? 0) + 1
    return { total: keys.length, counts }
  })
}

export function useProject(id: UUID | undefined) {
  return useLiveQuery(async () => (id ? ((await db.projects.get(id)) ?? null) : null), [id])
}
