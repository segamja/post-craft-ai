import type { CarouselSlide, UserImage } from '@shared/domain'

export type SlideContent = Pick<CarouselSlide, 'imageId' | 'title' | 'body'>
import type { NamedFile } from './share'
import { imageFile } from './share'

// Carousel 슬라이드 → 업로드용 이미지 (Instagram 권장 1080×1080 / 1080×1350).
// 화면 미리보기와 같은 구성: 사진 위 하단 그라데이션 + 제목·본문, 사진이 없으면 가운데 정렬 텍스트 카드.

export type SlideRatio = '1:1' | '4:5'

const SIZE: Record<SlideRatio, [number, number]> = { '1:1': [1080, 1080], '4:5': [1080, 1350] }
const FONT = '"Pretendard Variable", Pretendard, -apple-system, "Segoe UI", sans-serif'
const BG = '#073342' // primary-dark
const PAD = 84

/** 글자 단위 줄바꿈 (한국어는 띄어쓰기가 적어 단어 단위로는 넘친다). maxLines를 넘으면 … */
export function wrapText(measure: (s: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const ch of para) {
      if (measure(line + ch) > maxWidth && line) {
        lines.push(line)
        line = ch.trimStart()
      } else line += ch
    }
    lines.push(line)
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = kept[maxLines - 1]!.replace(/.$/, '…')
  return kept
}

async function loadBitmap(image: UserImage | undefined): Promise<ImageBitmap | null> {
  if (!image) return null
  const file = await imageFile(image, 'x')
  if (!file) return null
  try {
    return await createImageBitmap(file.blob)
  } catch {
    return null
  }
}

function drawCover(ctx: CanvasRenderingContext2D, bmp: ImageBitmap, w: number, h: number) {
  const scale = Math.max(w / bmp.width, h / bmp.height)
  const dw = bmp.width * scale
  const dh = bmp.height * scale
  ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

async function renderOne(slide: SlideContent, index: number, count: number, image: UserImage | undefined, ratio: SlideRatio) {
  const [w, h] = SIZE[ratio]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  const bmp = await loadBitmap(image)
  if (bmp) {
    drawCover(ctx, bmp, w, h)
    bmp.close()
    const g = ctx.createLinearGradient(0, h * 0.35, 0, h)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.45, 'rgba(0,0,0,0.4)')
    g.addColorStop(1, 'rgba(0,0,0,0.78)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  // 쪽 번호
  ctx.font = `600 30px ${FONT}`
  const pager = `${index + 1} / ${count}`
  const pw = ctx.measureText(pager).width + 36
  ctx.fillStyle = 'rgba(17,24,39,0.6)'
  ctx.beginPath()
  ctx.roundRect(w - PAD - pw, PAD - 10, pw, 52, 26)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.fillText(pager, w - PAD - pw + 18, PAD + 16)

  // 제목·본문
  const maxWidth = w - PAD * 2
  ctx.font = `700 66px ${FONT}`
  const titleLines = wrapText((s) => ctx.measureText(s).width, slide.title || ' ', maxWidth, 3)
  ctx.font = `400 38px ${FONT}`
  const bodyLines = slide.body ? wrapText((s) => ctx.measureText(s).width, slide.body, maxWidth, 6) : []
  const titleLH = 84
  const bodyLH = 56
  const gap = bodyLines.length ? 28 : 0
  const blockH = titleLines.length * titleLH + gap + bodyLines.length * bodyLH

  const centered = !bmp
  let y = centered ? (h - blockH) / 2 : h - PAD - blockH
  ctx.textAlign = centered ? 'center' : 'left'
  const x = centered ? w / 2 : PAD
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#fff'
  ctx.font = `700 66px ${FONT}`
  for (const line of titleLines) {
    ctx.fillText(line, x, y)
    y += titleLH
  }
  y += gap
  ctx.font = `400 38px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  for (const line of bodyLines) {
    ctx.fillText(line, x, y)
    y += bodyLH
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92),
  )
}

export async function renderSlides(slides: SlideContent[], images: UserImage[], ratio: SlideRatio): Promise<NamedFile[]> {
  await document.fonts?.load(`700 66px ${FONT}`).catch(() => undefined)
  const out: NamedFile[] = []
  for (const [i, s] of slides.entries()) {
    const image = images.find((img) => img.id === s.imageId)
    out.push({ name: `슬라이드${i + 1}.jpg`, blob: await renderOne(s, i, slides.length, image, ratio) })
  }
  return out
}
