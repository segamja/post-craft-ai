import { UnsplashSearchRequest } from '../shared/schemas/unsplash.js'
import { errorResponse } from './_lib/errors.js'
import { guard, toPhoto, unsplashFetch } from './_lib/unsplash.js'

// Unsplash 검색 (명세 §18 unsplash-search). 결과는 요약 목록으로만 돌려준다.
export const POST = guard(async (body) => {
  const parsed = UnsplashSearchRequest.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_FAILED')
  const { query, page } = parsed.data
  const qs = new URLSearchParams({ query, page: String(page), per_page: '20', content_filter: 'high' })
  const res = await unsplashFetch(`/search/photos?${qs}`)
  const json = (await res.json()) as { results: Parameters<typeof toPhoto>[0][]; total_pages: number }
  return Response.json({ ok: true, data: { results: json.results.map(toPhoto), totalPages: json.total_pages } })
})
