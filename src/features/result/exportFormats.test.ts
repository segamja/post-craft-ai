import type { ContentBlock, ImageAnalysis, UserImage } from '@shared/domain'
import { describe, expect, it } from 'vitest'
import { blocksToHtml, blocksToMarkdown, blocksToText, captionText } from './exportFormats'

const base = {
  projectId: 'p',
  status: 'ready' as const,
  fileName: null,
  mimeType: 'image/jpeg',
  width: 1,
  height: 1,
  byteSize: 1,
  createdAt: '',
  updatedAt: '',
}
const upload: UserImage = { ...base, id: 'u1', position: 0, source: 'upload', altText: null, unsplash: null }
const unsplash: UserImage = {
  ...base,
  id: 'u2',
  position: 1,
  source: 'unsplash',
  altText: '해변',
  unsplash: {
    photoId: 'x',
    externalUrl: 'https://images.unsplash.com/x',
    photographerName: 'Kim',
    photographerUrl: 'https://unsplash.com/@kim',
    downloadLocation: 'https://api.unsplash.com/photos/x/download',
  },
}
const analyses = new Map<string, ImageAnalysis>([
  ['u1', { imageId: 'u1', projectId: 'p', description: '', tags: [], detectedText: null, suggestedAlt: '노을 사진', model: 'm', analyzedAt: '' }],
])
const ctx = { images: [upload, unsplash], analyses }

const blocks: ContentBlock[] = [
  { id: '1', type: 'heading', level: 2, text: '첫날 <노을>' },
  { id: '2', type: 'paragraph', text: '바다를 봤다\n좋았다' },
  { id: '3', type: 'image', imageId: 'u1', caption: '애월' },
  { id: '4', type: 'image', imageId: 'u2', caption: null },
  { id: '5', type: 'image', imageId: 'deleted', caption: null },
]

describe('복사 형식', () => {
  it('Markdown: 업로드 사진은 사진n.jpg 자리 표시 + suggestedAlt, Unsplash는 URL과 출처', () => {
    const md = blocksToMarkdown(blocks, ctx)
    expect(md).toContain('## 첫날 <노을>')
    expect(md).toContain('![노을 사진](사진1.jpg)\n*애월*')
    expect(md).toContain('![해변](https://images.unsplash.com/x)')
    expect(md).toContain('Photo by [Kim](https://unsplash.com/@kim?utm_source=postcraft_ai&utm_medium=referral) on [Unsplash]')
    expect(md).not.toContain('deleted')
  })

  it('HTML: 텍스트를 이스케이프하고 줄바꿈을 <br>로', () => {
    const html = blocksToHtml(blocks, ctx)
    expect(html).toContain('<h2>첫날 &lt;노을&gt;</h2>')
    expect(html).toContain('<p>바다를 봤다<br>좋았다</p>')
    expect(html).toContain('<img src="사진1.jpg" alt="노을 사진">')
    expect(html).toContain('<figcaption>Photo by <a href="https://unsplash.com/@kim?utm_source=postcraft_ai&amp;utm_medium=referral">Kim</a>')
  })

  it('일반 텍스트: 사진 자리 표시와 출처', () => {
    const text = blocksToText(blocks, ctx)
    expect(text).toContain('[사진 1: 애월]')
    expect(text).toContain('[사진 2]\nPhoto by Kim on Unsplash')
  })

  it('캡션 + 해시태그 + 사용한 Unsplash 출처', () => {
    expect(captionText('캡션', ['제주', '노을'], ['u1', 'u2'], ctx)).toBe('캡션\n\n#제주 #노을\n\nPhoto by Kim on Unsplash')
    expect(captionText('캡션', [], ['u1'], ctx)).toBe('캡션')
  })
})
