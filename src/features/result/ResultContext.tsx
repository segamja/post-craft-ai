import type { ContentProject, ImageAnalysis, UserImage, UUID } from '@shared/domain'
import { createContext, useContext } from 'react'
import { resolveAltText } from '@/features/image/api/analysisRepo'
import type { ResultData } from './resultQueries'

export interface ResultContextValue extends ResultData {
  project: ContentProject
}

export const ResultContext = createContext<ResultContextValue | null>(null)

export function useResult(): ResultContextValue {
  const v = useContext(ResultContext)
  if (!v) throw new Error('ResultContext missing')
  return v
}

/** 표시용 이미지 정보: 별칭(IMG n), 대체 텍스트 */
export function imageMeta(images: UserImage[], analyses: Map<UUID, ImageAnalysis>, id: UUID | null) {
  const index = id ? images.findIndex((i) => i.id === id) : -1
  const image = index >= 0 ? images[index]! : null
  return {
    image,
    index,
    alias: index >= 0 ? `IMG${index + 1}` : null,
    alt: image ? resolveAltText(image, analyses.get(image.id), index) : '',
  }
}
