// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoryOut } from '../shared/schemas/ai'
import { chatJson } from './_lib/openai'
import { POST as analyze } from './analyze-image'
import { POST as carousel } from './generate-carousel'
import { POST as platform } from './generate-platform'
import { POST as story } from './generate-story'

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const project = { purpose: 'travel', purposeDetail: null, tone: 'polite', sourceDescription: '제주 여행. 노을이 예뻤다' }
const images = [
  { alias: 'IMG1', position: 0, description: '바닷가 노을', tags: ['노을'], detectedText: null },
  { alias: 'IMG2', position: 1, description: '해산물 파스타', tags: ['음식'], detectedText: '애월식당' },
]
const storyCtx = { title: '제주', summary: '요약', blocks: [{ type: 'image', imageRef: 'IMG1', caption: null }] }

afterEach(() => vi.unstubAllEnvs())

describe('Vercel Functions (Mock 모드)', () => {
  it('각 단계가 스키마에 맞는 응답을 돌려준다', async () => {
    vi.stubEnv('AI_MOCK', '1')
    const a = await (await analyze(req({ image: { url: 'https://images.unsplash.com/photo-1?w=1024' } }))).json()
    expect(a).toMatchObject({ ok: true, model: 'mock' })

    const s = await (await story(req({ project, images }))).json()
    expect(StoryOut.safeParse(s.data).success).toBe(true)
    expect(s.data.blocks.some((b: { imageRef?: string }) => b.imageRef === 'IMG2')).toBe(true)

    for (const p of ['blog', 'instagram', 'facebook']) {
      const r = await platform(req({ platform: p, project, images, story: storyCtx }))
      expect(r.status).toBe(200)
    }

    const c = await (
      await carousel(req({ project, images, story: storyCtx, instagram: { caption: 'c', hashtags: [] }, slideCount: 2 }))
    ).json()
    expect(c.data.slides).toHaveLength(2)
  })

  it('잘못된 요청은 VALIDATION_FAILED (400)', async () => {
    vi.stubEnv('AI_MOCK', '1')
    const r = await story(req({ project, images: [] }))
    expect(r.status).toBe(400)
    expect((await r.json()).error.code).toBe('VALIDATION_FAILED')
    // Unsplash 외부 URL만 허용
    expect((await analyze(req({ image: { url: 'https://evil.example.com/a.jpg' } }))).status).toBe(400)
  })

  it('APP_ACCESS_TOKEN이 설정되면 x-app-token이 일치해야 한다', async () => {
    vi.stubEnv('AI_MOCK', '1')
    vi.stubEnv('APP_ACCESS_TOKEN', 'secret')
    expect((await story(req({ project, images }))).status).toBe(401)
    expect((await story(req({ project, images }, { 'x-app-token': 'secret' }))).status).toBe(200)
  })

  it('운영 환경에서 키가 없으면 Mock으로 넘어가지 않고 AI_NOT_CONFIGURED', async () => {
    vi.stubEnv('AI_MOCK', '')
    vi.stubEnv('OPENAI_API_KEY', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    const r = await story(req({ project, images }))
    expect((await r.json()).error.code).toBe('AI_NOT_CONFIGURED')
  })
})

describe('chatJson', () => {
  const completion = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }))
  const valid = JSON.stringify({ title: 't', summary: 's', blocks: [{ type: 'paragraph', text: 'p' }], verificationItems: [] })
  const args = { apiKey: 'k', model: 'm', name: 'story', system: 's', user: 'u', schema: StoryOut }

  it('strict json_schema로 요청하고 사용량을 합산한다', async () => {
    const fetchImpl = vi.fn(async () => completion(valid))
    const res = await chatJson({ ...args, fetchImpl })
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.response_format.json_schema.strict).toBe(true)
  })

  it('스키마 위반이면 1회 재시도하고, 두 번 실패하면 AI_SCHEMA_INVALID', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = JSON.stringify({ title: 'x'.repeat(100), summary: '', blocks: [], verificationItems: [] })
    const retryOk = vi.fn().mockResolvedValueOnce(completion(bad)).mockResolvedValueOnce(completion(valid))
    expect((await chatJson({ ...args, fetchImpl: retryOk })).data.title).toBe('t')
    expect(retryOk).toHaveBeenCalledTimes(2)

    const alwaysBad = vi.fn(async () => completion(bad))
    await expect(chatJson({ ...args, fetchImpl: alwaysBad })).rejects.toMatchObject({ code: 'AI_SCHEMA_INVALID' })
  })

  it('HTTP 오류는 AI_UPSTREAM_ERROR', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => new Response('rate limited', { status: 429 }))
    await expect(chatJson({ ...args, fetchImpl })).rejects.toMatchObject({ code: 'AI_UPSTREAM_ERROR' })
  })
})
