interface CreditMeterProps {
  used: number
  limit: number
}

// 사이드바 하단 "AI 생성 한도" (로컬 ai_jobs 오늘 집계)
export function CreditMeter({ used, limit }: CreditMeterProps) {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-surface-hover p-3">
      <div className="flex items-center justify-between text-body-sm text-ink-secondary">
        <span>AI 생성 한도</span>
        <span className="font-mono text-primary">
          {used} / {limit}건
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label="오늘 AI 생성 사용량"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}
