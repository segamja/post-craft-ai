// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST as search } from './unsplash-search'
import { POST as track } from './unsplash-track-download'

const req = (body: unknown) =>
  new Request('http://localhost/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const raw = {
  id: 'abc',
  alt_description: 'sunset',
  description: null,
  width: 4000,
  height: 3000,
  color: '#335577',
  urls: { small: 'https://images.unsplash.com/s', regular: 'https://images.unsplash.com/r' },
  user: { name: 'Kim', links: { html: 'https://unsplash.com/@kim' } },
  links: { download_location: 'https://api.unsplash.com/photos/abc/download' },
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Unsplash 함수', () => {
  it('검색: Client-ID로 호출하고 요약 목록을 돌려준다', async () => {
    vi.stubEnv('UNSPLASH_ACCESS_KEY', 'key123')
    const fetchMock = vi.fn(async () => Response.json({ results: [raw], total_pages: 3 }))
    vi.stubGlobal('fetch', fetchMock)
    const json = await (await search(req({ query: '제주 노을', page: 1 }))).json()
    expect(json).toEqual({
      ok: true,
      data: {
        totalPages: 3,
        results: [
          {
            id: 'abc',
            alt: 'sunset',
            width: 4000,
            height: 3000,
            color: '#335577',
            thumbUrl: 'https://images.unsplash.com/s',
            url: 'https://images.unsplash.com/r',
            photographerName: 'Kim',
            photographerUrl: 'https://unsplash.com/@kim',
            downloadLocation: 'https://api.unsplash.com/photos/abc/download',
          },
        ],
      },
    })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/search/photos?query=%EC%A0%9C%EC%A3%BC')
    expect((init.headers as Record<string, string>).Authorization).toBe('Client-ID key123')
  })

  it('키가 없으면 UNSPLASH_NOT_CONFIGURED', async () => {
    vi.stubEnv('UNSPLASH_ACCESS_KEY', '')
    const r = await search(req({ query: 'x' }))
    expect((await r.json()).error.code).toBe('UNSPLASH_NOT_CONFIGURED')
  })

  it('download 추적은 api.unsplash.com/photos/ 주소만 허용한다', async () => {
    vi.stubEnv('UNSPLASH_ACCESS_KEY', 'key123')
    const fetchMock = vi.fn(async () => Response.json({ url: 'x' }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await track(req({ downloadLocation: 'https://evil.example.com/x' }))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await track(req({ downloadLocation: raw.links.download_location }))).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
