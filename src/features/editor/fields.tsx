import { X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** 내용에 맞춰 높이가 늘어나는 textarea */
export function AutoTextarea({ className, value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn('w-full resize-none overflow-hidden bg-transparent focus:outline-none', className)}
      {...props}
    />
  )
}

/** 글자 수 표시. 권장치를 넘으면 앰버, 한도에 닿으면 빨강 */
export function CharCount({ value, max, recommended }: { value: string; max?: number; recommended?: number }) {
  const n = value.length
  const tone = max !== undefined && n >= max ? 'text-danger' : recommended !== undefined && n > recommended ? 'text-warning' : 'text-ink-muted'
  return (
    <span className={cn('font-mono text-body-sm', tone)}>
      {n.toLocaleString()}
      {max !== undefined && ` / ${max.toLocaleString()}`}자
      {recommended !== undefined && max === undefined && ` (권장 ${recommended.toLocaleString()}자 이내)`}
    </span>
  )
}

/** 해시태그 편집: Enter/쉼표로 추가, # 자동 제거, 최대 개수 제한 */
export function HashtagEditor({
  tags,
  max,
  recommended,
  onChange,
}: {
  tags: string[]
  max: number
  recommended?: readonly [number, number]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')
  const full = tags.length >= max

  const add = () => {
    const tag = input.replace(/^#+/, '').replace(/[\s,]+/g, '')
    setInput('')
    if (!tag || tags.includes(tag) || full) return
    onChange([...tags, tag])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-h3">해시태그</span>
        <span className={cn('font-mono text-body-sm', full ? 'text-danger' : 'text-ink-muted')}>
          {tags.length} / {max}
          {recommended && ` (권장 ${recommended[0]}~${recommended[1]})`}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <li key={t} className="inline-flex items-center gap-1 rounded-lg bg-primary-light px-2 py-1 text-body-sm text-primary-dark">
            #{t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`#${t} 삭제`}>
              <X className="size-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <input
        value={input}
        disabled={full}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        placeholder={full ? '최대 개수에 도달했어요' : '해시태그 입력 후 Enter'}
        aria-label="해시태그 추가"
        className="rounded-lg border bg-surface px-3 py-2 text-body-sm focus:border-border-focus focus:outline-none disabled:bg-surface-hover"
      />
    </div>
  )
}
