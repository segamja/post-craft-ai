import type { ContentPurpose } from '@shared/domain'
import { AI_RULES } from '@shared/platformRules'
import { ArrowRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useTodayJobCount } from '@/features/ai/api/aiJobQueries'
import { useProjectSummaries } from '@/features/project/api/projectQueries'
import { ProjectGrid } from '@/features/project/components/ProjectGrid'
import { PurposeFilter } from '@/features/project/components/PurposeFilter'

const RECENT_LIMIT = 8

export function HomePage() {
  const [purpose, setPurpose] = useState<ContentPurpose | undefined>()
  const data = useProjectSummaries({ limit: RECENT_LIMIT, purpose })
  const used = useTodayJobCount() ?? 0
  const limit = AI_RULES.dailyJobLimit

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6 rounded-xl border bg-surface p-6 shadow-e1 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-display">사진 몇 장으로 시작하세요</h1>
          <p className="text-body-lg text-ink-secondary">
            사진과 짧은 설명을 넣으면 AI가 하나의 Story를 만들고, Blog·Instagram·Facebook 콘텐츠로 바꿔드립니다.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <Link
            to="/projects/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-h3 text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="size-5" aria-hidden="true" />새 콘텐츠 만들기
          </Link>
          <p className="text-body-sm text-ink-secondary">
            오늘 AI 생성 <span className="font-mono text-primary">{used}</span> / {limit}건
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-h2">최근 콘텐츠</h2>
          <PurposeFilter value={purpose} onChange={setPurpose} />
        </div>
        {data && <ProjectGrid items={data.items} />}
        {data && data.total > RECENT_LIMIT && (
          <Link
            to={purpose ? `/projects?purpose=${purpose}` : '/projects'}
            className="inline-flex items-center gap-1 self-end font-semibold text-primary hover:underline"
          >
            전체 {data.total}개 보기
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </section>
    </div>
  )
}
