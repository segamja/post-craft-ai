import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'

// 개발 전용: design.md 토큰 확인용 샘플 (개발계획 A0 완료 기준)
const COLORS = [
  ['primary', 'bg-primary'],
  ['primary-hover', 'bg-primary-hover'],
  ['primary-light', 'bg-primary-light'],
  ['primary-dark', 'bg-primary-dark'],
  ['background', 'bg-background'],
  ['surface', 'bg-surface'],
  ['surface-hover', 'bg-surface-hover'],
  ['border', 'bg-border'],
  ['ink', 'bg-ink'],
  ['ink-secondary', 'bg-ink-secondary'],
  ['ink-muted', 'bg-ink-muted'],
  ['warning', 'bg-warning'],
  ['warning-bg', 'bg-warning-bg'],
  ['success', 'bg-success'],
  ['success-bg', 'bg-success-bg'],
  ['danger', 'bg-danger'],
  ['danger-bg', 'bg-danger-bg'],
  ['stale', 'bg-stale'],
] as const

const TYPE = [
  ['display 28/700', 'text-display'],
  ['h1 22/700', 'text-h1'],
  ['h2 18/600', 'text-h2'],
  ['h3 15/600', 'text-h3'],
  ['body-lg 15/400', 'text-body-lg'],
  ['body 14/400', 'text-body'],
  ['body-sm 12/500', 'text-body-sm'],
  ['badge 11/600', 'text-badge'],
] as const

export function DesignTokensPage() {
  return (
    <>
      <PageHeader title="디자인 토큰" description="design.md 기준 · 개발 전용 화면" />

      <section className="mb-8">
        <h2 className="mb-3 text-h2">Color</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map(([name, cls]) => (
            <div key={name} className="overflow-hidden rounded-xl border bg-surface shadow-e1">
              <div className={`h-14 ${cls}`} />
              <p className="px-3 py-2 font-mono text-body-sm">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-h2">Typography</h2>
        <div className="flex flex-col gap-2 rounded-xl border bg-surface p-6">
          {TYPE.map(([label, cls]) => (
            <div key={label} className="flex items-baseline gap-4">
              <span className="w-32 shrink-0 font-mono text-body-sm text-ink-muted">{label}</span>
              <span className={cls}>사진 한 장이 이야기가 됩니다</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-h2">Elevation · Radius</h2>
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl border bg-surface p-6">elevation-0</div>
          <div className="rounded-xl bg-surface p-6 shadow-e1">elevation-1</div>
          <div className="rounded-xl bg-surface p-6 shadow-e2">elevation-2</div>
          <div className="rounded-2xl bg-surface p-6 shadow-floating">floating · 16px</div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-h2">Components</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover">
            AI로 콘텐츠 만들기
          </button>
          <button className="rounded-lg border bg-surface px-4 py-2 font-semibold hover:bg-surface-hover">
            결과 복사
          </button>
          <span className="inline-flex items-center gap-1 rounded-lg border border-warning bg-warning-bg px-2 py-0.5 text-badge text-warning">
            <AlertTriangle className="size-3" aria-hidden="true" />
            사진/설명에서 확인되지 않음 · 확인하기
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-1.5">
            Instagram
            <span className="size-1.5 rounded-full bg-stale" aria-label="업데이트 필요" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-body-sm text-ink-secondary">
            <span className="size-1.5 rounded-full bg-success" />
            저장됨
          </span>
        </div>
      </section>
    </>
  )
}
