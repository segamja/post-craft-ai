// 앱 도메인 타입 (명세 §6). 로컬 DB(IndexedDB) 전환에 따라 다음을 조정했다.
// - 단일 사용자: userId 없음
// - storagePath 대신 이미지 원본은 imageBlobs 테이블(같은 id)에 Blob으로 저장
// - 날짜는 ISO 8601 문자열

export type UUID = string
export type ISODateString = string

export type Platform = 'blog' | 'instagram' | 'facebook'
export const PLATFORMS: readonly Platform[] = ['blog', 'instagram', 'facebook']

export type ContentPurpose =
  | 'travel'
  | 'daily'
  | 'cafe_restaurant'
  | 'product'
  | 'new_menu'
  | 'event'
  | 'review'
  | 'other'

export type ContentTone = 'polite' | 'casual'
export type ProjectStatus = 'draft' | 'generated'

export type ContentBlock =
  | { id: UUID; type: 'heading'; level: 2 | 3; text: string }
  | { id: UUID; type: 'paragraph'; text: string }
  | { id: UUID; type: 'image'; imageId: UUID; caption: string | null }

export interface VerificationItem {
  id: UUID
  text: string
  reason: string
  resolved: boolean
}

export interface ContentProject {
  id: UUID
  title: string
  purpose: ContentPurpose
  purposeDetail: string | null
  sourceDescription: string
  tone: ContentTone
  language: 'ko'
  status: ProjectStatus
  imageSetVersion: number
  createdAt: ISODateString
  updatedAt: ISODateString
}

export type ImageSource = 'upload' | 'unsplash'
export type ImageStatus = 'pending' | 'ready' | 'failed'

export interface UnsplashInfo {
  photoId: string
  externalUrl: string
  photographerName: string
  photographerUrl: string
  downloadLocation: string
}

export interface UserImage {
  id: UUID
  projectId: UUID
  /** null = 교체 대기 중 (목록에 표시하지 않음) */
  position: number | null
  source: ImageSource
  status: ImageStatus
  fileName: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  byteSize: number | null
  altText: string | null
  unsplash: UnsplashInfo | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface ImageAnalysis {
  imageId: UUID
  projectId: UUID
  description: string
  tags: string[]
  detectedText: string | null
  suggestedAlt: string
  model: string
  analyzedAt: ISODateString
}

/** AI가 덮어쓰기 직전 내용 (명세 §9.5, 되돌리기 1회) */
export type Snapshot = Record<string, unknown>

export interface ContentStory {
  id: UUID
  projectId: UUID
  title: string
  summary: string
  blocks: ContentBlock[]
  verificationItems: VerificationItem[]
  version: number
  sourceImageSetVersion: number
  previousSnapshot: Snapshot | null
  aiGeneratedAt: ISODateString | null
  userEditedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface PlatformContent {
  id: UUID
  projectId: UUID
  platform: Platform
  title: string | null
  blocks: ContentBlock[]
  caption: string | null
  hashtags: string[]
  coverImageId: UUID | null
  verificationItems: VerificationItem[]
  sourceStoryVersion: number
  previousSnapshot: Snapshot | null
  aiGeneratedAt: ISODateString | null
  userEditedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

/** Facebook 첨부 이미지 (명세 platform_content_media) */
export interface PlatformContentMedia {
  platformContentId: UUID
  projectId: UUID
  imageId: UUID
  position: number
}

export interface CarouselContent {
  id: UUID
  projectId: UUID
  platformContentId: UUID
  previousSnapshot: Snapshot | null
  aiGeneratedAt: ISODateString | null
  userEditedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface CarouselSlide {
  id: UUID
  carouselId: UUID
  projectId: UUID
  position: number
  imageId: UUID | null
  title: string
  body: string
}

export type AiStep = 'analyze_images' | 'generate_story' | 'generate_platform' | 'generate_carousel'
export type AiJobStatus = 'running' | 'succeeded' | 'failed'

export interface AiJob {
  id: UUID
  projectId: UUID
  step: AiStep
  target: Platform | null
  status: AiJobStatus
  errorCode: string | null
  inputTokens: number | null
  outputTokens: number | null
  startedAt: ISODateString
  finishedAt: ISODateString | null
}

// 파생 상태 (저장하지 않음, 명세 §6.11)
export const isPlatformStale = (p: Pick<PlatformContent, 'sourceStoryVersion'>, s: Pick<ContentStory, 'version'>) =>
  p.sourceStoryVersion < s.version

export const isStoryStale = (
  s: Pick<ContentStory, 'sourceImageSetVersion'>,
  prj: Pick<ContentProject, 'imageSetVersion'>,
) => s.sourceImageSetVersion < prj.imageSetVersion

export const isUserEdited = (c: { userEditedAt: string | null }) => c.userEditedAt !== null
