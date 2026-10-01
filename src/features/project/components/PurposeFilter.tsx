import type { ContentPurpose } from '@shared/domain'
import { cn } from '@/lib/utils'
import { usePurposeCounts } from '../api/projectQueries'
import { PURPOSES } from '../model/purpose'

interface PurposeFilterProps {
  value: ContentPurpose | undefined
  onChange: (value: ContentPurpose | undefined) => void
}

/** 목적별 필터 칩. 프로젝트가 있는 목적만 보여준다 */
export function PurposeFilter({ value, onChange }: PurposeFilterProps) {
  const data = usePurposeCounts()
  if (!data || data.total === 0) return null

  const chips = [
    { value: undefined, label: '전체', count: data.total },
    ...PURPOSES.filter((p) => data.counts[p.value]).map((p) => ({ ...p, count: data.counts[p.value]! })),
  ]

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="목적별 보기">
      {chips.map((c) => {
        const active = c.value === value
        return (
          <button
            key={c.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(c.value)}
            className={cn(
              'rounded-full px-3 py-1 text-body-sm transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'border bg-surface text-ink-secondary hover:bg-surface-hover',
            )}
          >
            {c.label} ({c.count})
          </button>
        )
      })}
    </div>
  )
}
