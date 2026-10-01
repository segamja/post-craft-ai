import type { ContentBlock, UserImage } from '@shared/domain'
import { describe, expect, it } from 'vitest'
import { blocksToPasteHtml } from '@/features/result/exportFormats'
import { wrapText } from './renderSlides'
import { normalizeTistoryBlog, TARGETS } from './targets'

describe('SNS 글쓰기 대상', () => {
  it('티스토리 블로그 주소를 여러 형태로 받는다', () => {
    expect(normalizeTistoryBlog('myblog')).toBe('myblog')
    expect(normalizeTistoryBlog(' MyBlog.tistory.com ')).toBe('myblog')
    expect(normalizeTistoryBlog('https://my-blog.tistory.com/manage')).toBe('my-blog')
    expect(normalizeTistoryBlog('not a blog!')).toBeNull()
    expect(normalizeTistoryBlog('')).toBeNull()
  })

  it('글쓰기 주소: 티스토리는 블로그 주소가 있어야 열린다', () => {
    expect(TARGETS.naver.url({})).toBe('https://blog.naver.com/GoBlogWrite.naver')
    expect(TARGETS.tistory.url({ tistoryBlog: null })).toBeNull()
    expect(TARGETS.tistory.url({ tistoryBlog: 'myblog' })).toBe('https://myblog.tistory.com/manage/newpost/')
  })
})

describe('슬라이드 줄바꿈', () => {
  const measure = (s: string) => s.length * 10

  it('글자 단위로 줄을 나누고 줄바꿈 문자를 지킨다', () => {
    expect(wrapText(measure, '가나다라마바', 30, 5)).toEqual(['가나다', '라마바'])
    expect(wrapText(measure, '가나\n다', 100, 5)).toEqual(['가나', '다'])
  })

  it('최대 줄 수를 넘으면 마지막 줄을 …로 끝낸다', () => {
    expect(wrapText(measure, '가나다라마바사아', 30, 2)).toEqual(['가나다', '라마…'])
  })
})

describe('블로그 붙여넣기 HTML', () => {
  const image: UserImage = {
    id: 'i1',
    projectId: 'p',
    position: 0,
    source: 'upload',
    status: 'ready',
    fileName: null,
    mimeType: 'image/jpeg',
    width: 1,
    height: 1,
    byteSize: 1,
    altText: null,
    unsplash: null,
    createdAt: '',
    updatedAt: '',
  }
  const blocks: ContentBlock[] = [
    { id: '1', type: 'heading', level: 2, text: '첫날' },
    { id: '2', type: 'image', imageId: 'i1', caption: '노을 & 바다' },
    { id: '3', type: 'paragraph', text: '좋았다' },
  ]

  it('사진은 넣을 자리 표시로, 텍스트는 서식째', () => {
    const html = blocksToPasteHtml(blocks, { images: [image], analyses: new Map() })
    expect(html).toContain('<h2>첫날</h2>')
    expect(html).toContain('<b>[사진 1 넣을 자리 · 사진1.jpg]</b><br>노을 &amp; 바다')
    expect(html).toContain('<p>좋았다</p>')
    expect(html).not.toContain('<img')
  })
})
