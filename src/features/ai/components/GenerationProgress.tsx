import type { UUID } from '@shared/domain'
import { ERROR_MESSAGES } from '@shared/errorCodes'
import { Check, Circle, Loader2, RotateCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGenerationProgress, type UnitKey, type UnitProgress } from '../api/progressQueries'
import { startGeneration } from '../startGeneration'

const LABEL: Record<UnitKey, string> = {
  analyze: '사진 분석',
  story: 'Story',
  blog: 'Blog',
  instagram: 'Instagram',
  facebook: 'Facebook',
  carousel: 'Carousel',
}

function UnitIcon({ status }: { status: UnitProgress['status'] }) {
  const cls = 'size-4 shrink-0'
  if (status === 'ready') return <Check className={cn(cls, 'text-success')} aria-hidden="true" />
  if (status === 'generating') return <Loader2 className={cn(cls, 'animate-spin text-primary')} aria-hidden="true" />
  if (status === 'failed') return <X className={cn(cls, 'text-danger')} aria-hidden="true" />
  return <Circle className={cn(cls, 'text-ink-muted')} aria-hidden="true" />
}

const STATUS_SR: Record<UnitProgress['status'], string> = {
  none: '대기',
  generating: '생성 중',
  ready: '완료',
  failed: '실패',
}

/** 생성 진행 표시 (명세 §13.5): ✓ 사진 분석 (8/8) ✓ Story ◐ Blog … ✕ Facebook [다시 시도] ○ Carousel */
export function GenerationProgress({ projectId }: { projectId: UUID }) {
  const progress = useGenerationProgress(projectId)
  if (!progress) return null

  const failed = progress.units.filter((u) => u.status === 'failed')

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4 shadow-e1" aria-label="생성 진행 상황">
      <ol className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-live="polite">
        {progress.units.map((u) => (
          <li key={u.key} className="flex items-center gap-1.5">
            <UnitIcon status={u.status} />
            <span className={cn(u.status === 'none' && 'text-ink-muted', u.status === 'failed' && 'text-danger')}>
              {LABEL[u.key]}
              {u.key === 'analyze' && progress.total > 0 && (
                <span className="ml-1 font-mono text-body-sm">
                  ({progress.analyzed}/{progress.total})
                </span>
              )}
            </span>
            <span className="sr-only">{STATUS_SR[u.status]}</span>
          </li>
        ))}
      </ol>

      {failed.length > 0 && !progress.anyRunning && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger-bg px-3 py-2">
          <p className="text-body-sm text-danger">
            {failed.map((u) => LABEL[u.key]).join(', ')} 생성에 실패했어요.{' '}
            {failed[0]?.errorCode && ERROR_MESSAGES[failed[0].errorCode]}
          </p>
          <button
            type="button"
            onClick={() => void startGeneration(projectId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 font-semibold hover:bg-surface-hover"
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            다시 시도
          </button>
        </div>
      )}
    </section>
  )
}
