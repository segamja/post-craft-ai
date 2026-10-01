import type { UserImage } from '@shared/domain'
import { getImageBlob } from '@/features/image/api/imageRepo'

// 클립보드·다운로드·Web Share 도우미

/** 서식 있는 복사 (블로그 에디터는 text/html을 서식째 붙여넣는다). 지원하지 않으면 일반 텍스트 */
export async function copyRich(html: string, text: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      return true
    }
  } catch {
    // 아래 일반 텍스트로
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 새 창 열기. 팝업이 막히면 false */
export function openWindow(url: string): boolean {
  // 'noopener'를 주면 항상 null이 돌아와 차단 여부를 알 수 없으므로, 연 뒤에 opener를 끊는다
  const w = window.open(url, '_blank')
  if (!w) return false
  w.opener = null
  return true
}

export interface NamedFile {
  name: string
  blob: Blob
}

/** 프로젝트 사진 → 파일 (업로드: IndexedDB Blob, Unsplash: 원격에서 가져오기) */
export async function imageFile(image: UserImage, name: string): Promise<NamedFile | null> {
  if (image.source === 'upload') {
    const blob = await getImageBlob(image.id)
    return blob ? { name, blob } : null
  }
  if (!image.unsplash) return null
  try {
    const res = await fetch(image.unsplash.externalUrl)
    return res.ok ? { name, blob: await res.blob() } : null
  } catch {
    return null
  }
}

/** 여러 파일 내려받기 (브라우저가 "여러 파일 다운로드" 허용을 물을 수 있다) */
export async function downloadFiles(files: NamedFile[]): Promise<void> {
  for (const f of files) {
    const url = URL.createObjectURL(f.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    // 연속 다운로드가 한 번에 막히지 않도록 약간 간격을 둔다
    await new Promise((r) => setTimeout(r, 150))
  }
}

const toFiles = (files: NamedFile[]) =>
  files.map((f) => new File([f.blob], f.name, { type: f.blob.type || 'image/jpeg' }))

/** 휴대폰 등에서 사진+글을 앱으로 공유할 수 있는지 */
export function canShareFiles(): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'a.jpg', { type: 'image/jpeg' })] })
  } catch {
    return false
  }
}

/** Web Share (취소하면 false) */
export async function shareFiles(files: NamedFile[], text: string): Promise<boolean> {
  try {
    await navigator.share({ files: toFiles(files), text })
    return true
  } catch {
    return false
  }
}
