// 플랫폼·업로드 제한값의 단일 출처 (명세 §8.1, §11). 출시 전 각 플랫폼 정책을 다시 확인한다.

export const IMAGE_RULES = {
  maxPerProject: 10,
  maxOriginalBytes: 20 * 1024 * 1024,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  resizeLongEdge: 2048,
  jpegQuality: 0.85,
  uploadConcurrency: 3,
} as const

export const PROJECT_RULES = {
  purposeDetailMax: 50,
  sourceDescriptionMax: 1000,
} as const

export const PLATFORM_RULES = {
  blog: { titleMax: 80, recommendedLength: [1500, 3000], hashtagsMax: 10 },
  instagram: { captionMax: 2200, recommendedHook: 125, hashtagsMax: 30, recommendedHashtags: [5, 15] },
  facebook: { recommendedLength: 500, hashtagsMax: 5, mediaMax: 10 },
} as const

export const CAROUSEL_RULES = {
  slidesMin: 1,
  slidesMax: 20,
  titleMax: 40,
  bodyMax: 200,
  /** 기본 생성 수 = min(이미지 수, defaultSlidesCap) */
  defaultSlidesCap: 10,
} as const

export const AI_RULES = {
  dailyJobLimit: 50,
  jobTimeoutMs: 5 * 60 * 1000,
} as const
