import { z } from 'zod'
import { CAROUSEL_RULES, IMAGE_RULES, PROJECT_RULES } from '../platformRules.js'
import {
  AiBlock,
  BlogOut,
  CarouselOut,
  FacebookOut,
  ImageAnalysisOut,
  InstagramOut,
  StoryOut,
} from './ai.js'

// /api/* 요청·응답 계약. 서버는 상태를 갖지 않으므로 생성에 필요한 맥락을 클라이언트가 모두 보낸다.

const ALIAS = /^IMG\d{1,2}$/

export const ProjectContext = z.object({
  purpose: z.enum(['travel', 'daily', 'cafe_restaurant', 'product', 'new_menu', 'event', 'review', 'other']),
  purposeDetail: z.string().max(PROJECT_RULES.purposeDetailMax).nullable(),
  tone: z.enum(['polite', 'casual']),
  sourceDescription: z.string().max(PROJECT_RULES.sourceDescriptionMax),
})

/** 프롬프트에 들어가는 사진 정보: 원본 대신 분석 텍스트만 (명세 §10.5) */
export const ImageContext = z.object({
  alias: z.string().regex(ALIAS),
  position: z.number().int().min(0),
  description: z.string().max(500),
  tags: z.array(z.string()).max(10),
  detectedText: z.string().max(1000).nullable(),
})

export const StoryContext = z.object({
  title: z.string().max(200),
  summary: z.string().max(1000),
  blocks: z.array(AiBlock).max(80),
})

/** 분석용 이미지: 업로드는 축소한 JPEG data URL, Unsplash는 hotlink URL */
export const AiImageInput = z.union([
  z.object({ dataUrl: z.string().startsWith('data:image/jpeg;base64,').max(3_000_000) }),
  z.object({ url: z.url().startsWith('https://images.unsplash.com/') }),
])

export const AnalyzeImageRequest = z.object({ image: AiImageInput })

const images = z.array(ImageContext).min(1).max(IMAGE_RULES.maxPerProject)

export const GenerateStoryRequest = z.object({ project: ProjectContext, images })

export const GeneratePlatformRequest = z.object({
  platform: z.enum(['blog', 'instagram', 'facebook']),
  project: ProjectContext,
  images,
  story: StoryContext,
})

export const GenerateCarouselRequest = z.object({
  project: ProjectContext,
  images,
  story: StoryContext,
  instagram: z.object({ caption: z.string().max(2200), hashtags: z.array(z.string()).max(30) }),
  slideCount: z.number().int().min(CAROUSEL_RULES.slidesMin).max(CAROUSEL_RULES.slidesMax),
})

export const Usage = z.object({ inputTokens: z.number().int(), outputTokens: z.number().int() })

/** 성공 응답 래퍼 */
export const apiOk = <T extends z.ZodType>(data: T) =>
  z.object({ ok: z.literal(true), data, usage: Usage, model: z.string() })

export const AnalyzeImageResponse = apiOk(ImageAnalysisOut)
export const GenerateStoryResponse = apiOk(StoryOut)
/** 플랫폼별 스키마가 필드 일부를 공유하므로 합집합 대신 플랫폼별로 검증한다 */
export const GeneratePlatformResponse = {
  blog: apiOk(BlogOut),
  instagram: apiOk(InstagramOut),
  facebook: apiOk(FacebookOut),
} as const
export const GenerateCarouselResponse = apiOk(CarouselOut)

export const ApiErrorBody = z.object({
  ok: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
})

export type ProjectContextT = z.infer<typeof ProjectContext>
export type ImageContextT = z.infer<typeof ImageContext>
export type StoryContextT = z.infer<typeof StoryContext>
export type AiImageInputT = z.infer<typeof AiImageInput>
export type UsageT = z.infer<typeof Usage>
export type GenerateStoryRequestT = z.infer<typeof GenerateStoryRequest>
export type GeneratePlatformRequestT = z.infer<typeof GeneratePlatformRequest>
export type GenerateCarouselRequestT = z.infer<typeof GenerateCarouselRequest>
