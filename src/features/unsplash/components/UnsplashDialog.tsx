import type { UUID } from '@shared/domain'
import { ERROR_MESSAGES, isAppError } from '@shared/errorCodes'
import { UnsplashSearchResponse, UnsplashTrackResponse, type UnsplashPhotoT } from '@shared/schemas/unsplash'
import { Loader2, Plus, Search } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'
import { addUnsplashImage } from '@/features/image/api/imageRepo'
import { UNSPLASH_HOME, withUtm } from '@/features/result/exportFormats'
import { postApi } from '@/lib/apiClient'
import { toast } from '@/stores/uiStore'

/** 프로젝트에 추가 = 콘텐츠에서 사용하는 시점 → download 추적 호출 (명세 §8.6) */
async function addPhoto(projectId: UUID, p: UnsplashPhotoT) {
  await addUnsplashImage(
    projectId,
    {
      photoId: p.id,
      externalUrl: p.url,
      photographerName: p.photographerName,
      photographerUrl: p.photographerUrl,
      downloadLocation: p.downloadLocation,
    },
    p.alt,
  )
  void postApi('/api/unsplash-track-download', { downloadLocation: p.downloadLocation }, UnsplashTrackResponse).catch((e) =>
    console.warn('[unsplash] track failed', e),
  )
}

export function UnsplashDialog({
  projectId,
  open,
  onOpenChange,
  remaining,
}: {
  projectId: UUID
  open: boolean
  onOpenChange: (open: boolean) => void
  remaining: number
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<UnsplashPhotoT[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const search = async (q: string, p: number) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await postApi('/api/unsplash-search', { query: q, page: p }, UnsplashSearchResponse)
      setResults((prev) => (p === 1 ? res.data.results : [...prev, ...res.data.results]))
      setTotalPages(res.data.totalPages)
      setPage(p)
    } catch (e) {
      toast(isAppError(e) ? ERROR_MESSAGES[e.code] : 'Unsplash 검색에 실패했어요.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const left = remaining - added.size

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100%-32px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl bg-surface p-6 shadow-floating">
          <div>
            <Dialog.Title className="text-h2">Unsplash에서 사진 찾기</Dialog.Title>
            <Dialog.Description className="mt-1 text-ink-secondary">
              보조 이미지로 추가합니다. 사진 아래와 복사한 글에 작가 출처가 함께 표시돼요. (남은 자리 {Math.max(0, left)}장)
            </Dialog.Description>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void search(query, 1)
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: jeju sunset, coffee"
              aria-label="검색어"
              className="flex-1 rounded-lg border bg-surface px-3 py-2 focus:border-border-focus focus:outline-none"
            />
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover">
              <Search className="size-4" aria-hidden="true" />
              검색
            </button>
          </form>

          <div className="min-h-40 flex-1 overflow-y-auto">
            {results.length === 0 && !loading && <p className="py-12 text-center text-ink-muted">검색어를 입력하세요. 영어로 검색하면 결과가 더 많아요.</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {results.map((p) => {
                const isAdded = added.has(p.id)
                return (
                  <li key={p.id} className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={isAdded || left <= 0}
                      onClick={async () => {
                        try {
                          await addPhoto(projectId, p)
                          setAdded((s) => new Set(s).add(p.id))
                        } catch (e) {
                          toast(isAppError(e) ? e.message : '사진을 추가하지 못했어요.', 'error')
                        }
                      }}
                      className="group relative aspect-[4/3] overflow-hidden rounded-lg disabled:cursor-default"
                      style={{ backgroundColor: p.color ?? undefined }}
                      aria-label={`${p.alt ?? '사진'} 추가`}
                    >
                      <img src={p.thumbUrl} alt={p.alt ?? ''} loading="lazy" className="size-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-ink-inverse opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100">
                        {isAdded ? '추가됨' : left <= 0 ? '최대 장수' : <Plus className="size-6" aria-hidden="true" />}
                      </span>
                    </button>
                    <span className="truncate text-badge font-normal text-ink-secondary">
                      Photo by{' '}
                      <a href={withUtm(p.photographerUrl)} target="_blank" rel="noreferrer" className="underline">
                        {p.photographerName}
                      </a>{' '}
                      on{' '}
                      <a href={UNSPLASH_HOME} target="_blank" rel="noreferrer" className="underline">
                        Unsplash
                      </a>
                    </span>
                  </li>
                )
              })}
            </ul>
            {loading && <Loader2 className="mx-auto my-6 size-6 animate-spin text-ink-muted" aria-label="불러오는 중" />}
            {!loading && page < totalPages && (
              <button type="button" onClick={() => void search(query, page + 1)} className="mx-auto mt-4 block rounded-lg border px-4 py-2 hover:bg-surface-hover">
                더 보기
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <Dialog.Close className="rounded-lg border px-4 py-2 font-semibold hover:bg-surface-hover">닫기</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

