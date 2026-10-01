import Dexie, { type EntityTable } from 'dexie'
import type {
  AiJob,
  CarouselContent,
  CarouselSlide,
  ContentProject,
  ContentStory,
  ImageAnalysis,
  PlatformContent,
  PlatformContentMedia,
  UserImage,
} from '@shared/domain'

/** 이미지 원본. 행(UserImage)과 분리해 목록 조회 시 Blob을 읽지 않게 한다. */
export interface ImageBlob {
  id: string
  blob: Blob
}

export interface SettingRow {
  key: string
  value: unknown
}

/**
 * 로컬 DB (IndexedDB). 명세 §17의 테이블을 그대로 옮기되,
 * 트리거·RPC·FK 동작은 src/lib/db/rules.ts 와 각 repo의 트랜잭션에서 보장한다.
 * 이 테이블들에 직접 쓰지 말고 반드시 repo 함수를 거친다.
 */
export class PostCraftDB extends Dexie {
  projects!: EntityTable<ContentProject, 'id'>
  images!: EntityTable<UserImage, 'id'>
  imageBlobs!: EntityTable<ImageBlob, 'id'>
  imageAnalyses!: EntityTable<ImageAnalysis, 'imageId'>
  stories!: EntityTable<ContentStory, 'id'>
  platformContents!: EntityTable<PlatformContent, 'id'>
  platformContentMedia!: Dexie.Table<PlatformContentMedia, [string, string]>
  carousels!: EntityTable<CarouselContent, 'id'>
  carouselSlides!: EntityTable<CarouselSlide, 'id'>
  aiJobs!: EntityTable<AiJob, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'postcraft') {
    super(name)
    this.version(1).stores({
      projects: 'id, updatedAt, purpose',
      // position=null 인 행은 복합 인덱스에서 빠진다 → 목록 조회에서 자연히 제외
      images: 'id, projectId, [projectId+position]',
      imageBlobs: 'id',
      imageAnalyses: 'imageId, projectId',
      stories: 'id, &projectId',
      platformContents: 'id, projectId, &[projectId+platform]',
      platformContentMedia: '[platformContentId+imageId], platformContentId, imageId, projectId',
      carousels: 'id, &platformContentId, projectId',
      carouselSlides: 'id, carouselId, imageId, projectId',
      aiJobs: 'id, projectId, startedAt',
    })
    // v2: 앱 설정(동의 기록 등) key-value
    this.version(2).stores({ settings: 'key' })
  }
}

export const db = new PostCraftDB()

/** 프로젝트 하위 데이터 전체 (CASCADE 삭제·트랜잭션 범위 지정용) */
export const projectTables = () => [
  db.projects,
  db.images,
  db.imageBlobs,
  db.imageAnalyses,
  db.stories,
  db.platformContents,
  db.platformContentMedia,
  db.carousels,
  db.carouselSlides,
  db.aiJobs,
]
