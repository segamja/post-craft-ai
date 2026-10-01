// 아직 구현하지 않은 화면 자리. 단계 ID는 docs/PostCraft_AI_개발계획_V1.0.md §3 참고.
export function Placeholder({ step, children }: { step: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-surface p-10 text-center text-ink-muted">
      <p className="text-body-sm">구현 예정 · {step}</p>
      {children}
    </div>
  )
}
