import type { UUID } from '@shared/domain'
import { useLiveQuery } from 'dexie-react-hooks'
import { getCarousel } from '@/features/carousel/api/carouselRepo'
import { listAnalyses } from '@/features/image/api/analysisRepo'
import { listImages } from '@/features/image/api/imageRepo'
import { listPlatformContents } from '@/features/platform/api/platformRepo'
import { getStory } from '@/features/story/api/storyRepo'

/** 결과 화면 데이터 한 번에 (로컬 DB라 조인 비용이 작다) */
export const useResultData = (projectId: UUID) =>
  useLiveQuery(async () => {
    const [images, analyses, story, platforms, carousel] = await Promise.all([
      listImages(projectId),
      listAnalyses(projectId),
      getStory(projectId),
      listPlatformContents(projectId),
      getCarousel(projectId),
    ])
    return { images, analyses, story: story ?? null, platforms, carousel: carousel ?? null }
  }, [projectId])

export type ResultData = NonNullable<ReturnType<typeof useResultData>>
