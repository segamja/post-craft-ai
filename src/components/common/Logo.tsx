import { cn } from '@/lib/utils'

// 원본: stitch_design_document_setup/postcraft_ai_wordmark_logo (색상은 디자인 토큰으로 교체)
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="8" className="fill-primary-dark" />
        <path
          d="M8 8H20C21.1 8 22 8.9 22 10V18C22 19.1 21.1 20 20 20H8V8Z"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="13" cy="13" r="1.5" fill="#fff" />
        <path
          d="M8 17L12 13L16 17L20 14"
          stroke="#fff"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[18px] font-bold tracking-tight text-ink">
        PostCraft<span className="font-extrabold text-primary">.</span>
        <span className="text-[13px] font-medium text-ink-secondary">AI</span>
      </span>
    </span>
  )
}
