import type { UserImage, UUID } from '@shared/domain'
import { Check, ImageOff } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useImageUrl } from '@/features/image/api/useImageUrl'
import { cn } from '@/lib/utils'

function Thumb({ image, label, selected, order }: { image: UserImage; label: string; selected: boolean; order?: number }) {
  const url = useImageUrl(image)
  return (
    <span
      className={cn(
        'relative block aspect-square overflow-hidden rounded-lg border-2 bg-surface-hover',
        selected ? 'border-primary' : 'border-transparent',
      )}
    >
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <span className="absolute top-1 left-1 rounded bg-ink/70 px-1 font-mono text-badge text-ink-inverse">{label}</span>
      {selected && (
        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-badge text-primary-foreground">
          {order ?? <Check className="size-3" aria-hidden="true" />}
        </span>
      )}
    </span>
  )
}

interface ImagePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  images: UserImage[]
  /** 단일 선택: 고르는 즉시 닫힌다. allowNone이면 "이미지 없음" 선택지 */
  selected?: UUID | null
  allowNone?: boolean
  onSelect?: (id: UUID | null) => void
  /** 다중 선택(순서 있음): Facebook 첨부 */
  multi?: { ids: UUID[]; max: number; onChange: (ids: UUID[]) => void }
}

/** 프로젝트 사진 중에서 고르기 (본문 이미지 블록, 커버, 슬라이드, Facebook 첨부) */
export function ImagePicker({ open, onOpenChange, title, images, selected, allowNone, onSelect, multi }: ImagePickerProps) {
  const ready = images.filter((i) => i.status === 'ready')
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-floating">
          <Dialog.Title className="text-h2">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-ink-secondary">
            {multi ? `순서대로 선택하세요 (최대 ${multi.max}장)` : '프로젝트에 올린 사진 중에서 고르세요'}
          </Dialog.Description>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {allowNone && (
              <button
                type="button"
                onClick={() => {
                  onSelect?.(null)
                  onOpenChange(false)
                }}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 bg-surface-hover text-body-sm text-ink-secondary',
                  selected === null ? 'border-primary' : 'border-transparent',
                )}
              >
                <ImageOff className="size-5" aria-hidden="true" />
                이미지 없음
              </button>
            )}
            {ready.map((img) => {
              const label = `IMG${images.indexOf(img) + 1}`
              const order = multi ? multi.ids.indexOf(img.id) : -1
              const isSel = multi ? order >= 0 : selected === img.id
              return (
                <button
                  key={img.id}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={label}
                  onClick={() => {
                    if (multi) {
                      const next = isSel ? multi.ids.filter((x) => x !== img.id) : [...multi.ids, img.id]
                      if (next.length <= multi.max) multi.onChange(next)
                    } else {
                      onSelect?.(img.id)
                      onOpenChange(false)
                    }
                  }}
                >
                  <Thumb image={img} label={label} selected={isSel} order={multi && isSel ? order + 1 : undefined} />
                </button>
              )
            })}
          </div>
          {multi && (
            <div className="mt-4 flex justify-end">
              <Dialog.Close className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover">
                완료
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
