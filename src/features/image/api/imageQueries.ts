import type { UUID } from '@shared/domain'
import { useLiveQuery } from 'dexie-react-hooks'
import { listImages } from './imageRepo'

/** 프로젝트의 표시 중인 이미지 (position 순) */
export const useImages = (projectId: UUID) => useLiveQuery(() => listImages(projectId), [projectId])
