import type { ContentBlock, ImageAnalysis, UserImage, UUID } from '@shared/domain'
import { resolveAltText } from '@/features/image/api/analysisRepo'

// 결과 복사 형식 (명세 §2.1, §11): 일반 텍스트 / Markdown / HTML, 캡션 + 해시태그.
// 업로드 사진은 로컬에만 있으므로 자리 표시(사진n.jpg)를 넣고, 사진 패널의 다운로드 파일명과 맞춘다.
// Unsplash 사진은 hotlink URL과 출처 표기를 함께 넣는다 (명세 §8.6).

const UTM = 'utm_source=postcraft_ai&utm_medium=referral'

export const withUtm = (url: string) => `${url}${url.includes('?') ? '&' : '?'}${UTM}`
export const UNSPLASH_HOME = withUtm('https://unsplash.com/')

export interface ImageLookup {
  images: UserImage[]
  analyses: Map<UUID, ImageAnalysis>
}

/** 사진 패널 다운로드 파일명과 같은 규칙 */
export const photoFileName = (index: number) => `사진${index + 1}.jpg`

function lookup(ctx: ImageLookup, id: UUID) {
  const index = ctx.images.findIndex((i) => i.id === id)
  const image = ctx.images[index]
  return image ? { image, index, alt: resolveAltText(image, ctx.analyses.get(image.id), index) } : null
}

export function unsplashCredit(image: UserImage) {
  const u = image.unsplash
  if (!u) return null
  return {
    text: `Photo by ${u.photographerName} on Unsplash`,
    md: `Photo by [${u.photographerName}](${withUtm(u.photographerUrl)}) on [Unsplash](${UNSPLASH_HOME})`,
    html: `Photo by <a href="${esc(withUtm(u.photographerUrl))}">${esc(u.photographerName)}</a> on <a href="${esc(UNSPLASH_HOME)}">Unsplash</a>`,
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function blocksToText(blocks: ContentBlock[], ctx: ImageLookup): string {
  return blocks
    .flatMap((b) => {
      if (b.type !== 'image') return [b.text]
      const m = lookup(ctx, b.imageId)
      if (!m) return []
      const credit = unsplashCredit(m.image)
      return [[`[사진 ${m.index + 1}${b.caption ? `: ${b.caption}` : ''}]`, credit?.text].filter(Boolean).join('\n')]
    })
    .filter((s) => s.trim())
    .join('\n\n')
}

export function blocksToMarkdown(blocks: ContentBlock[], ctx: ImageLookup): string {
  return blocks
    .flatMap((b) => {
      if (b.type === 'heading') return [`${'#'.repeat(b.level)} ${b.text}`]
      if (b.type === 'paragraph') return [b.text]
      const m = lookup(ctx, b.imageId)
      if (!m) return []
      const src = m.image.unsplash?.externalUrl ?? photoFileName(m.index)
      const credit = unsplashCredit(m.image)
      return [[`![${m.alt}](${src})`, b.caption && `*${b.caption}*`, credit && `<sub>${credit.md}</sub>`].filter(Boolean).join('\n')]
    })
    .filter((s) => s.trim())
    .join('\n\n')
}

export function blocksToHtml(blocks: ContentBlock[], ctx: ImageLookup): string {
  return blocks
    .flatMap((b) => {
      if (b.type === 'heading') return [`<h${b.level}>${esc(b.text)}</h${b.level}>`]
      if (b.type === 'paragraph') return [`<p>${esc(b.text).replace(/\n/g, '<br>')}</p>`]
      const m = lookup(ctx, b.imageId)
      if (!m) return []
      const src = m.image.unsplash?.externalUrl ?? photoFileName(m.index)
      const credit = unsplashCredit(m.image)
      const caption = [b.caption && esc(b.caption), credit?.html].filter(Boolean).join('<br>')
      return [
        `<figure>\n  <img src="${esc(src)}" alt="${esc(m.alt)}">${caption ? `\n  <figcaption>${caption}</figcaption>` : ''}\n</figure>`,
      ]
    })
    .join('\n')
}

export const hashtagLine = (tags: string[]) => tags.map((t) => `#${t}`).join(' ')

/** 캡션 + 해시태그 (+ 사용한 Unsplash 사진 출처) */
export function captionText(caption: string, tags: string[], imageIds: UUID[], ctx: ImageLookup): string {
  const credits = imageIds
    .map((id) => lookup(ctx, id))
    .flatMap((m) => (m ? [unsplashCredit(m.image)?.text] : []))
    .filter(Boolean)
  return [caption.trim(), tags.length ? hashtagLine(tags) : '', credits.length ? credits.join('\n') : '']
    .filter(Boolean)
    .join('\n\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
