import { z } from 'zod'
import { CAROUSEL_RULES, PLATFORM_RULES } from '../platformRules.js'

// AI 응답 스키마 (명세 §10.6). OpenAI Structured Outputs와 응답 재검증에 함께 쓴다.
// 이미지는 UUID 대신 별칭(IMG1…)으로만 참조한다 (명세 §10.4).

export const ImageAnalysisOut = z.object({
  description: z.string().max(500),
  tags: z.array(z.string()).max(10),
  detectedText: z.string().nullable(),
  suggestedAlt: z.string().max(120),
})

export const AiBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), text: z.string() }),
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('image'), imageRef: z.string(), caption: z.string().nullable() }),
])

export const AiVerification = z.object({ text: z.string(), reason: z.string() })

export const StoryOut = z.object({
  title: z.string().max(80),
  summary: z.string().max(300),
  blocks: z.array(AiBlock).min(1).max(40),
  verificationItems: z.array(AiVerification).max(10),
})

export const BlogOut = z.object({
  title: z.string().max(PLATFORM_RULES.blog.titleMax),
  coverImageRef: z.string().nullable(),
  blocks: z.array(AiBlock).min(1).max(60),
  hashtags: z.array(z.string()).max(PLATFORM_RULES.blog.hashtagsMax),
  verificationItems: z.array(AiVerification).max(10),
})

export const InstagramOut = z.object({
  caption: z.string().max(PLATFORM_RULES.instagram.captionMax),
  hashtags: z.array(z.string()).max(PLATFORM_RULES.instagram.hashtagsMax),
  verificationItems: z.array(AiVerification).max(10),
})

export const FacebookOut = z.object({
  caption: z.string().max(5000),
  mediaImageRefs: z.array(z.string()).max(PLATFORM_RULES.facebook.mediaMax),
  hashtags: z.array(z.string()).max(PLATFORM_RULES.facebook.hashtagsMax),
  verificationItems: z.array(AiVerification).max(10),
})

export const CarouselOut = z.object({
  slides: z
    .array(
      z.object({
        imageRef: z.string().nullable(),
        title: z.string().max(CAROUSEL_RULES.titleMax),
        body: z.string().max(CAROUSEL_RULES.bodyMax),
      }),
    )
    .min(CAROUSEL_RULES.slidesMin)
    .max(CAROUSEL_RULES.slidesMax),
})

export type ImageAnalysisOutT = z.infer<typeof ImageAnalysisOut>
export type AiBlockT = z.infer<typeof AiBlock>
export type AiVerificationT = z.infer<typeof AiVerification>
export type StoryOutT = z.infer<typeof StoryOut>
export type BlogOutT = z.infer<typeof BlogOut>
export type InstagramOutT = z.infer<typeof InstagramOut>
export type FacebookOutT = z.infer<typeof FacebookOut>
export type CarouselOutT = z.infer<typeof CarouselOut>

export const PlatformOut = { blog: BlogOut, instagram: InstagramOut, facebook: FacebookOut } as const
