import type { VerificationItem } from '@shared/domain'
import { ERROR_MESSAGES, isAppError } from '@shared/errorCodes'
import { AlertTriangle, Check, Copy, Loader2, RefreshCw, Trash2, Undo2, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { useGenerationProgress } from '@/features/ai/api/progressQueries'
import { regenerateUnit, type RegenUnit } from '@/features/ai/pipeline'
import { toast } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { copyText } from './exportFormats'
import { useResult } from './ResultContext'

export function Section({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border bg-surface p-4 shadow-e1', className)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-h3">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

/** 확인 필요 정보 (명세 §10.7): 앰버 칩, 확인 완료 / 삭제 */
export function VerificationPanel({ items, onChange }: { items: VerificationItem[]; onChange: (items: VerificationItem[]) => void }) {
  const open = items.filter((v) => !v.resolved).length
  return (
    <Section
      title="확인 필요 정보"
      aside={
        <span className={cn('rounded-md px-1.5 py-0.5 text-badge', open ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')}>
          {open}건
        </span>
      }
    >
      {items.length === 0 ? (
        <p className="text-body-sm text-ink-secondary">사진과 설명에서 확인되지 않은 정보가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((v) => (
            <li
              key={v.id}
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-3 text-body-sm',
                v.resolved ? 'border-border bg-background text-ink-muted' : 'border-warning bg-warning-bg',
              )}
            >
              <p className="flex gap-1.5">
                <AlertTriangle className={cn('mt-0.5 size-3.5 shrink-0', v.resolved ? 'text-ink-muted' : 'text-warning')} aria-hidden="true" />
                <span>
                  <strong className="font-semibold">“{v.text}”</strong> — {v.reason}
                </span>
              </p>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange(items.filter((x) => x.id !== v.id))}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  삭제
                </button>
                <button
                  type="button"
                  aria-pressed={v.resolved}
                  onClick={() => onChange(items.map((x) => (x.id === v.id ? { ...x, resolved: !x.resolved } : x)))}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold',
                    v.resolved ? 'hover:bg-surface' : 'bg-warning text-ink-inverse hover:opacity-90',
                  )}
                >
                  <Check className="size-3" aria-hidden="true" />
                  {v.resolved ? '확인 취소' : '확인 완료'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-badge text-ink-muted">본문에서 해당 문구를 직접 고친 뒤 확인 완료로 표시하세요.</p>
    </Section>
  )
}

export interface CopyOption {
  label: string
  icon?: LucideIcon
  get: () => string
}

export function CopyPanel({ options }: { options: CopyOption[] }) {
  return (
    <Section title="복사하기">
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const Icon = o.icon ?? Copy
          return (
            <button
              key={o.label}
              type="button"
              onClick={async () => toast((await copyText(o.get())) ? `${o.label}을(를) 복사했어요.` : '클립보드에 복사하지 못했어요.')}
              className="flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-left hover:bg-surface-hover"
            >
              <Icon className="size-4 text-ink-secondary" aria-hidden="true" />
              <span className="flex-1">{o.label}</span>
              <Copy className="size-3.5 text-ink-muted" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </Section>
  )
}

const UNIT_LABEL: Record<RegenUnit, string> = {
  story: 'Story',
  blog: 'Blog',
  instagram: 'Instagram',
  facebook: 'Facebook',
  carousel: 'Carousel',
}

interface UnitActionsProps {
  unit: RegenUnit
  entity: { userEditedAt: string | null; previousSnapshot: unknown }
  /** 재생성 전에 편집 중인 내용을 저장 */
  beforeRegenerate: () => Promise<void>
  revert: () => Promise<unknown>
  stale?: ReactNode
}

/**
 * 단위 재생성 + 덮어쓰기 경고 (명세 §9.4) + 직전 1개 되돌리기 (§9.5)
 */
export function UnitActions({ unit, entity, beforeRegenerate, revert, stale }: UnitActionsProps) {
  const { project } = useResult()
  const progress = useGenerationProgress(project.id)
  const running = progress?.units.find((u) => u.key === unit)?.status === 'generating'
  const [confirm, setConfirm] = useState(false)

  const run = async () => {
    await beforeRegenerate()
    try {
      await regenerateUnit(project.id, unit)
      toast(`${UNIT_LABEL[unit]}을(를) 다시 만들었어요. 필요하면 이전 내용으로 되돌릴 수 있어요.`)
    } catch (e) {
      toast(isAppError(e) ? ERROR_MESSAGES[e.code] : '다시 생성하지 못했어요.', 'error')
    }
  }

  return (
    <Section title="다시 생성">
      {stale}
      <p className="text-body-sm text-ink-secondary">
        {unit === 'story'
          ? '현재 사진과 설명으로 Story 전체를 새로 만듭니다.'
          : `현재 Story를 기준으로 ${UNIT_LABEL[unit]} 전체를 새로 만듭니다.`}
      </p>
      {entity.userEditedAt && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-body-sm text-danger">직접 수정한 내용이 있어요. 다시 생성하면 바뀝니다.</p>
      )}
      <button
        type="button"
        disabled={running}
        onClick={() => (entity.userEditedAt ? setConfirm(true) : void run())}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-dark px-4 py-2.5 font-semibold text-ink-inverse hover:bg-primary disabled:opacity-50"
      >
        {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        {running ? '생성 중…' : `${UNIT_LABEL[unit]} 다시 생성`}
      </button>
      {entity.previousSnapshot !== null && !running && (
        <button
          type="button"
          onClick={async () => {
            await beforeRegenerate()
            await revert()
            toast('이전 내용으로 되돌렸어요.')
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 hover:bg-surface-hover"
        >
          <Undo2 className="size-4" aria-hidden="true" />
          이전 내용으로 되돌리기
        </button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="다시 생성할까요?"
        description="직접 수정한 내용이 새로 생성된 내용으로 바뀝니다. 계속할까요?"
        confirmLabel="다시 생성"
        onConfirm={() => void run()}
      />
    </Section>
  )
}
