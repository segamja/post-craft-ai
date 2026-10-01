import { AlertDialog as Primitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/** 확인 모달 (삭제, 재생성 덮어쓰기 경고 등) */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-ink/30" />
        <Primitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-floating">
          <Primitive.Title className="text-h2">{title}</Primitive.Title>
          {description ? (
            <Primitive.Description className="mt-2 text-ink-secondary">{description}</Primitive.Description>
          ) : (
            <Primitive.Description className="sr-only">{title}</Primitive.Description>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Primitive.Cancel className="rounded-lg border bg-surface px-4 py-2 font-semibold hover:bg-surface-hover">
              {cancelLabel}
            </Primitive.Cancel>
            <Primitive.Action
              onClick={onConfirm}
              className={cn(
                'rounded-lg px-4 py-2 font-semibold text-ink-inverse',
                destructive ? 'bg-danger hover:opacity-90' : 'bg-primary hover:bg-primary-hover',
              )}
            >
              {confirmLabel}
            </Primitive.Action>
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}
