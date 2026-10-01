import { AppError } from '../../shared/errorCodes.js'
import type { UnsplashPhotoT } from '../../shared/schemas/unsplash.js'
import { readEnv } from './env.js'
import { errorResponse, toErrorResponse } from './errors.js'

const API = 'https://api.unsplash.com'

export function unsplashKey(): string {
  const key = readEnv().unsplashAccessKey
  if (!key) throw new AppError('UNSPLASH_NOT_CONFIGURED')
  return key
}

export async function unsplashFetch(url: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url.startsWith('http') ? url : `${API}${url}`, {
      headers: { Authorization: `Client-ID ${unsplashKey()}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError('UNSPLASH_ERROR')
  }
  if (!res.ok) {
    console.error('[unsplash]', res.status, (await res.text()).slice(0, 300))
    throw new AppError('UNSPLASH_ERROR')
  }
  return res
}

interface RawPhoto {
  id: string
  alt_description: string | null
  description: string | null
  width: number
  height: number
  color: string | null
  urls: { small: string; regular: string }
  user: { name: string; links: { html: string } }
  links: { download_location: string }
}

export const toPhoto = (p: RawPhoto): UnsplashPhotoT => ({
  id: p.id,
  alt: p.alt_description ?? p.description,
  width: p.width,
  height: p.height,
  color: p.color,
  thumbUrl: p.urls.small,
  url: p.urls.regular,
  photographerName: p.user.name,
  photographerUrl: p.user.links.html,
  downloadLocation: p.links.download_location,
})

/** 접근 토큰 확인 + JSON 본문 파싱 공통 처리 (AI 함수의 createHandler와 같은 규칙) */
export function guard(run: (body: unknown) => Promise<Response>) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const env = readEnv()
      if (env.accessToken && request.headers.get('x-app-token') !== env.accessToken) return errorResponse('ACCESS_DENIED')
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return errorResponse('VALIDATION_FAILED', '잘못된 요청 형식입니다.')
      }
      return await run(body)
    } catch (e) {
      return toErrorResponse(e)
    }
  }
}
