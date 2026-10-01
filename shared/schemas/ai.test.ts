import { describe, expect, it } from 'vitest'
import { toStrictJsonSchema } from '../jsonSchema'
import { BlogOut, CarouselOut, FacebookOut, ImageAnalysisOut, InstagramOut, StoryOut } from './ai'

const story = {
  title: '제주 여행',
  summary: '요약',
  blocks: [
    { type: 'heading', level: 2, text: '첫날' },
    { type: 'image', imageRef: 'IMG1', caption: null },
    { type: 'paragraph', text: '본문' },
  ],
  verificationItems: [],
}

describe('UT-01 AI 응답 스키마', () => {
  it('정상 응답을 통과시킨다', () => {
    expect(StoryOut.safeParse(story).success).toBe(true)
    expect(InstagramOut.safeParse({ caption: 'c', hashtags: ['a'], verificationItems: [] }).success).toBe(true)
  })

  it('길이 초과를 거부한다', () => {
    expect(StoryOut.safeParse({ ...story, title: 'x'.repeat(81) }).success).toBe(false)
    expect(InstagramOut.safeParse({ caption: 'x'.repeat(2201), hashtags: [], verificationItems: [] }).success).toBe(false)
    expect(FacebookOut.safeParse({ caption: '', mediaImageRefs: [], hashtags: Array(6).fill('a'), verificationItems: [] }).success).toBe(false)
    expect(CarouselOut.safeParse({ slides: [] }).success).toBe(false)
  })

  it('필드 누락과 잘못된 블록 타입을 거부한다', () => {
    const { summary: _s, ...noSummary } = story
    expect(StoryOut.safeParse(noSummary).success).toBe(false)
    expect(StoryOut.safeParse({ ...story, blocks: [{ type: 'video', url: 'x' }] }).success).toBe(false)
    expect(StoryOut.safeParse({ ...story, blocks: [{ type: 'heading', level: 1, text: 'x' }] }).success).toBe(false)
  })
})

describe('OpenAI strict JSON Schema 변환', () => {
  type Node = Record<string, unknown>
  const walk = (n: unknown, visit: (n: Node) => void) => {
    if (Array.isArray(n)) n.forEach((x) => walk(x, visit))
    else if (n && typeof n === 'object') {
      visit(n as Node)
      Object.values(n).forEach((x) => walk(x, visit))
    }
  }

  it.each([
    ['analysis', ImageAnalysisOut],
    ['story', StoryOut],
    ['blog', BlogOut],
    ['instagram', InstagramOut],
    ['facebook', FacebookOut],
    ['carousel', CarouselOut],
  ])('%s: 모든 object가 additionalProperties=false, 전 속성 required', (_name, schema) => {
    const json = toStrictJsonSchema(schema)
    expect(json.type).toBe('object')
    expect(json.$schema).toBeUndefined()
    walk(json, (n) => {
      expect(n.oneOf).toBeUndefined()
      expect(n.const).toBeUndefined()
      expect(n.maxLength).toBeUndefined()
      if (n.type === 'object' && n.properties) {
        expect(n.additionalProperties).toBe(false)
        expect(n.required).toEqual(Object.keys(n.properties as Node))
      }
    })
  })
})
