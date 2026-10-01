import { UnsplashTrackRequest } from '../shared/schemas/unsplash.js'
import { errorResponse } from './_lib/errors.js'
import { guard, unsplashFetch } from './_lib/unsplash.js'

// 사진을 콘텐츠에 사용하는 시점(프로젝트에 추가할 때) download 추적 호출 (명세 §8.6, Unsplash API 가이드라인)
export const POST = guard(async (body) => {
  const parsed = UnsplashTrackRequest.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_FAILED')
  await unsplashFetch(parsed.data.downloadLocation)
  return Response.json({ ok: true })
})
