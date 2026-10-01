import type { ContentPurpose, ContentTone } from '@shared/domain'
import { PROJECT_RULES } from '@shared/platformRules'
import {
  Check,
  ChefHat,
  Coffee,
  Ellipsis,
  MessageSquareQuote,
  PartyPopper,
  Plane,
  ShoppingBag,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PURPOSES } from '../model/purpose'

const PURPOSE_ICON: Record<ContentPurpose, LucideIcon> = {
  travel: Plane,
  daily: Sun,
  cafe_restaurant: Coffee,
  product: ShoppingBag,
  new_menu: ChefHat,
  event: PartyPopper,
  review: MessageSquareQuote,
  other: Ellipsis,
}

const TONES: { value: ContentTone; label: string; description: string; recommended?: boolean }[] = [
  { value: 'polite', label: '해요체', description: '친근하고 정중하게 대화하듯 공감을 이끌어내는 문체', recommended: true },
  { value: 'casual', label: '반말', description: '캐주얼하고 가벼운 일기 같은 친밀한 톤' },
]

interface PurposeFieldProps {
  purpose: ContentPurpose
  purposeDetail: string | null
  onChange: (next: { purpose: ContentPurpose; purposeDetail: string | null }) => void
}

export function PurposeField({ purpose, purposeDetail, onChange }: PurposeFieldProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-h3">콘텐츠 목적</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="콘텐츠 목적">
        {PURPOSES.map(({ value, label }) => {
          const Icon = PURPOSE_ICON[value]
          const active = value === purpose
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ purpose: value, purposeDetail: value === 'other' ? (purposeDetail ?? '') : null })}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-surface hover:border-primary hover:bg-primary-light',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {active && <Check className="size-4" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
      {purpose === 'other' && (
        <label className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-secondary">어떤 콘텐츠인가요? (필수)</span>
          <input
            value={purposeDetail ?? ''}
            maxLength={PROJECT_RULES.purposeDetailMax}
            onChange={(e) => onChange({ purpose, purposeDetail: e.target.value })}
            placeholder="예: 동네 플리마켓 홍보"
            className="rounded-lg border bg-surface px-3 py-2 focus:border-border-focus focus:outline-none"
          />
        </label>
      )}
    </fieldset>
  )
}

export function ToneField({ tone, onChange }: { tone: ContentTone; onChange: (tone: ContentTone) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-3 text-h3">글의 어조</legend>
      {TONES.map((t) => (
        <label
          key={t.value}
          className={cn(
            'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
            tone === t.value ? 'border-primary bg-primary-light' : 'bg-surface hover:bg-surface-hover',
          )}
        >
          <input
            type="radio"
            name="tone"
            value={t.value}
            checked={tone === t.value}
            onChange={() => onChange(t.value)}
            className="mt-1 accent-primary"
          />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 font-semibold">
              {t.label}
              {t.recommended && (
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-badge text-primary">기본 추천</span>
              )}
            </span>
            <span className="text-ink-secondary">{t.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
