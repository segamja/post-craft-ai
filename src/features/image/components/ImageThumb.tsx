import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UserImage } from '@shared/domain'
import { ERROR_MESSAGES } from '@shared/errorCodes'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Replace, RotateCw, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { useImageUrl } from '../api/useImageUrl'

interface ImageThumbProps {
  image: UserImage
  index: number
  count: number
  onDelete: (image: UserImage) => void
  onRetry: (image: UserImage) => void
  onReplace: (image: UserImage) => void
  onMove: (image: UserImage, delta: -1 | 1) => void
}

const iconBtn = 'rounded-md p-1 text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent'

export const ImageThumb = memo(function ImageThumb({
  image,
  index,
  count,
  onDelete,
  onRetry,
  onReplace,
  onMove,
}: ImageThumbProps) {
  const url = useImageUrl(image)
  const error = useUiStore((s) => s.uploadErrors[image.id])
  const canRetry = useUiStore((s) => image.id in s.uploadFiles)
  const replacing = useUiStore((s) => image.id in s.replacing)
  const label = image.altText || image.fileName || `사진 ${index + 1}`
  const busy = image.status === 'pending' || replacing

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex w-32 shrink-0 flex-col gap-1.5', isDragging && 'z-10 opacity-80')}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${label}, ${index + 1}번째. 스페이스로 집고 방향키로 옮깁니다`}
        className={cn(
          'relative aspect-square cursor-grab touch-none overflow-hidden rounded-xl border bg-surface-hover active:cursor-grabbing',
          image.status === 'failed' && 'border-danger bg-danger-bg',
          isDragging && 'shadow-floating',
        )}
      >
        {url && <img src={url} alt={label} draggable={false} className="size-full object-cover" />}

        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-surface/60 text-ink-muted" role="status">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            <span className="sr-only">{label} {replacing ? '교체 중' : '처리 중'}</span>
          </span>
        )}
        {image.status === 'failed' && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-badge text-danger">
            <AlertCircle className="size-5" aria-hidden="true" />
            {ERROR_MESSAGES[error ?? 'UNSUPPORTED_FILE'].replace(/\.$/, '')}
          </span>
        )}

        {image.source === 'unsplash' && (
          <span className="absolute right-1.5 bottom-1.5 rounded-md bg-surface/90 px-1.5 py-0.5 text-badge text-ink">Unsplash</span>
        )}
        <span className="absolute top-1.5 left-1.5 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-badge text-ink-inverse">
          {index === 0 ? '#1 대표' : `#${index + 1}`}
        </span>
      </div>

      <span className="truncate text-body-sm text-ink-secondary" title={label}>
        {label}
      </span>
      <div className="flex items-center justify-between">
        <div className="flex">
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onMove(image, -1)} aria-label={`${label} 앞으로`}>
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={iconBtn}
            disabled={index === count - 1}
            onClick={() => onMove(image, 1)}
            aria-label={`${label} 뒤로`}
          >
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex">
          {image.status === 'failed' && canRetry && (
            <button type="button" className={iconBtn} onClick={() => onRetry(image)} aria-label={`${label} 다시 시도`}>
              <RotateCw className="size-3.5" aria-hidden="true" />
            </button>
          )}
          {image.status === 'ready' && (
            <button
              type="button"
              className={iconBtn}
              disabled={busy}
              onClick={() => onReplace(image)}
              aria-label={`${label} 교체`}
            >
              <Replace className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(image)}
            disabled={busy}
            aria-label={`${label} 삭제`}
            className={cn(iconBtn, 'hover:bg-danger-bg hover:text-danger')}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
})
