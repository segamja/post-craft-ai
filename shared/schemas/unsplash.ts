import { z } from 'zod'

// Unsplash 보조 이미지 검색 (명세 §8.6, §18). Access Key 보호를 위해 서버 함수를 거친다.

export const UnsplashSearchRequest = z.object({
  query: z.string().trim().min(1).max(100),
  page: z.number().int().min(1).max(50).default(1),
})

export const UnsplashPhoto = z.object({
  id: z.string(),
  alt: z.string().nullable(),
  width: z.number().int(),
  height: z.number().int(),
  color: z.string().nullable(),
  thumbUrl: z.url(),
  /** hotlink 할 URL (urls.regular) */
  url: z.url(),
  photographerName: z.string(),
  photographerUrl: z.url(),
  downloadLocation: z.url(),
})

export const UnsplashSearchResponse = z.object({
  ok: z.literal(true),
  data: z.object({ results: z.array(UnsplashPhoto), totalPages: z.number().int() }),
})

export const UnsplashTrackRequest = z.object({
  downloadLocation: z.url().startsWith('https://api.unsplash.com/photos/'),
})

export const UnsplashTrackResponse = z.object({ ok: z.literal(true) })

export type UnsplashPhotoT = z.infer<typeof UnsplashPhoto>
