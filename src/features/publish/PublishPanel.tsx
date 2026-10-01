import type { UUID } from '@shared/domain'
import { Check, Download, ExternalLink, Loader2, Share2, Type } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { photoFileName } from '@/features/result/exportFormats'
import { Section } from '@/features/result/Inspector'
import { useResult } from '@/features/result/ResultContext'
import { toast } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { renderSlides, type SlideContent, type SlideRatio } from './renderSlides'
import { canShareFiles, copyRich, downloadFiles, imageFile, openWindow, shareFiles, type NamedFile } from './share'
import { getTistoryBlog, normalizeTistoryBlog, setTistoryBlog, TARGETS, type PublishTargetId } from './targets'

export interface PublishContent {
  /** 블로그 제목 (블로그만) */
  title?: string
  /** 서식 있는 본문 (블로그만) */
  html?: string
  /** 붙여넣을 텍스트 (캡션 + 해시태그 등) */
  text: string
}

type Props =
  | { kind: 'blog' | 'instagram' | 'facebook'; content: () => PublishContent; imageIds: UUID[] }
  | { kind: 'carousel'; content: () => PublishContent; slides: SlideContent[]; ratio: SlideRatio }

const BRAND: Record<PublishTargetId, string> = {
  naver: 'bg-[#03C75A] text-white hover:opacity-90',
  tistory: 'bg-[#EB531F] text-white hover:opacity-90',
  instagram: 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-90',
  facebook: 'bg-[#1877F2] text-white hover:opacity-90',
}

function BrandButton({ id, onClick, disabled, children }: { id: PublishTargetId; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold disabled:opacity-40', BRAND[id])}
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </button>
  )
}

const subBtn = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-body-sm hover:bg-surface-hover disabled:opacity-40'

/**
 * SNS 글쓰기 화면 바로 열기: 내용을 클립보드에 복사하고 해당 서비스의 글쓰기 화면을 새 창으로 연다.
 * 휴대폰처럼 파일 공유를 지원하는 환경에서는 사진과 글을 앱으로 바로 공유할 수 있다.
 */
export function PublishPanel(props: Props) {
  const { images } = useResult()
  const [busy, setBusy] = useState<string | null>(null)
  const [last, setLast] = useState<{ id: PublishTargetId; copied: boolean; opened: boolean; url: string } | null>(null)
  const [tistory, setTistory] = useState<string | null>(null)
  const [tistoryInput, setTistoryInput] = useState('')
  const [editingTistory, setEditingTistory] = useState(false)
  const shareable = canShareFiles()

  useEffect(() => {
    if (props.kind === 'blog') void getTistoryBlog().then(setTistory)
  }, [props.kind])

  /** 올릴 사진 파일: Carousel은 슬라이드 이미지, 나머지는 프로젝트 사진(사진n.jpg) */
  const collectFiles = async (): Promise<NamedFile[]> => {
    if (props.kind === 'carousel') return renderSlides(props.slides, images, props.ratio)
    const files = await Promise.all(
      props.imageIds.map((id) => {
        const index = images.findIndex((i) => i.id === id)
        return index >= 0 ? imageFile(images[index]!, photoFileName(index)) : Promise.resolve(null)
      }),
    )
    return files.filter((f): f is NamedFile => f !== null)
  }
  const fileCount = props.kind === 'carousel' ? props.slides.length : props.imageIds.length

  const open = async (id: PublishTargetId) => {
    const url = TARGETS[id].url({ tistoryBlog: tistory })
    if (!url) {
      setEditingTistory(true)
      return
    }
    const c = props.content()
    const copied = await copyRich(c.html ?? c.text.replace(/\n/g, '<br>'), c.text)
    const opened = openWindow(url)
    setLast({ id, copied, opened, url })
    toast(copied ? `내용을 복사했어요. ${TARGETS[id].label}에서 붙여넣기(Ctrl+V) 하세요.` : '복사하지 못했어요. 아래 복사 버튼을 이용하세요.', copied ? 'info' : 'error')
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  const download = () =>
    run('download', async () => {
      const files = await collectFiles()
      if (files.length === 0) return toast('내려받을 사진이 없어요.', 'error')
      await downloadFiles(files)
      toast(`${files.length}장을 내려받았어요.`)
    })

  const share = () =>
    run('share', async () => {
      const files = await collectFiles()
      await shareFiles(files, props.content().text)
    })

  const igTarget: PublishTargetId = props.kind === 'facebook' ? 'facebook' : 'instagram'

  return (
    <Section title="SNS에 올리기">
      <div className="flex flex-col gap-2">
        {props.kind === 'blog' ? (
          <>
            <BrandButton id="naver" onClick={() => void open('naver')}>
              네이버 블로그에 글쓰기
            </BrandButton>
            <BrandButton id="tistory" onClick={() => void open('tistory')}>
              티스토리에 글쓰기
            </BrandButton>
            {(editingTistory || tistory) && (
              <form
                className="flex flex-col gap-1.5 rounded-lg bg-background p-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const name = normalizeTistoryBlog(tistoryInput)
                  if (!name) return toast('블로그 주소를 확인해주세요. 예: myblog.tistory.com', 'error')
                  await setTistoryBlog(name)
                  setTistory(name)
                  setEditingTistory(false)
                  setTistoryInput('')
                }}
              >
                {editingTistory ? (
                  <>
                    <label htmlFor="tistory-blog" className="text-body-sm text-ink-secondary">
                      티스토리 블로그 주소
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        id="tistory-blog"
                        value={tistoryInput}
                        onChange={(e) => setTistoryInput(e.target.value)}
                        placeholder="myblog.tistory.com"
                        className="min-w-0 flex-1 rounded-lg border bg-surface px-2 py-1.5 text-body-sm focus:border-border-focus focus:outline-none"
                      />
                      <button type="submit" className="rounded-lg bg-primary px-3 text-body-sm font-semibold text-primary-foreground">
                        저장
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="flex items-center justify-between text-body-sm text-ink-secondary">
                    {tistory}.tistory.com
                    <button type="button" onClick={() => setEditingTistory(true)} className="underline">
                      변경
                    </button>
                  </p>
                )}
              </form>
            )}
          </>
        ) : (
          <BrandButton id={igTarget} onClick={() => void open(igTarget)}>
            {TARGETS[igTarget].label} 열기
          </BrandButton>
        )}

        <div className="flex gap-2">
          {props.kind === 'blog' && (
            <button
              type="button"
              className={subBtn}
              onClick={async () => {
                const ok = await copyRich(props.content().title ?? '', props.content().title ?? '')
                toast(ok ? '제목을 복사했어요.' : '복사하지 못했어요.')
              }}
            >
              <Type className="size-3.5" aria-hidden="true" />
              제목 복사
            </button>
          )}
          <button type="button" className={subBtn} disabled={fileCount === 0 || busy !== null} onClick={() => void download()}>
            {busy === 'download' ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Download className="size-3.5" aria-hidden="true" />}
            {props.kind === 'carousel' ? '슬라이드 이미지' : '사진'} 저장 ({fileCount})
          </button>
        </div>

        {shareable && props.kind !== 'blog' && (
          <button type="button" className={subBtn} disabled={busy !== null} onClick={() => void share()}>
            {busy === 'share' ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Share2 className="size-3.5" aria-hidden="true" />}
            사진과 글을 앱으로 공유
          </button>
        )}
      </div>

      {last ? (
        <div className="flex flex-col gap-1 rounded-lg bg-primary-light px-3 py-2 text-body-sm text-primary-dark" aria-live="polite">
          <p className="flex items-center gap-1 font-semibold">
            <Check className="size-3.5" aria-hidden="true" />
            {last.copied ? '내용을 복사했어요' : '복사에 실패했어요'}
          </p>
          <p>{TARGETS[last.id].hint}</p>
          {!last.opened && (
            <a href={last.url} target="_blank" rel="noreferrer" className="font-semibold underline">
              창이 열리지 않았어요. 여기를 눌러 {TARGETS[last.id].label} 열기
            </a>
          )}
        </div>
      ) : (
        <p className="text-badge text-ink-muted">
          버튼을 누르면 내용이 복사되고 글쓰기 화면이 새 창으로 열려요. 로그인이 필요할 수 있어요. 직접 게시는 각 서비스 공식 API 연동 후 지원 예정입니다.
        </p>
      )}
    </Section>
  )
}
