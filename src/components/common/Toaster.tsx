import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useUiStore, type Toast } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const DURATION_MS = 4000

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast)
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), DURATION_MS)
    return () => clearTimeout(t)
  }, [toast.id, dismiss])

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-floating',
        toast.tone === 'error' && 'border-danger bg-danger-bg',
      )}
    >
      <p className="flex-1">{toast.message}</p>
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="알림 닫기" className="text-ink-muted">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100%-32px))] flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
