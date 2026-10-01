import { useUiStore, type SaveStatus } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: '저장 중…',
  saved: '저장됨',
  error: '저장 실패 · 재시도',
}

const DOT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'bg-ink-muted',
  saved: 'bg-success',
  error: 'bg-danger',
}

export function SaveStatusIndicator() {
  const status = useUiStore((s) => s.saveStatus)
  const retry = useUiStore((s) => s.retrySave)

  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-body-sm',
    status === 'error' ? 'bg-danger-bg text-danger' : 'bg-surface-hover text-ink-secondary',
  )
  const content = (
    <>
      <span className={cn('size-1.5 rounded-full', DOT[status])} />
      {LABEL[status]}
    </>
  )

  return (
    <div aria-live="polite" className="min-w-0">
      {status === 'error' && retry ? (
        <button type="button" onClick={retry} className={className}>
          {content}
        </button>
      ) : (
        status !== 'idle' && <span className={className}>{content}</span>
      )}
    </div>
  )
}
