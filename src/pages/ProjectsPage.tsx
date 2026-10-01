import type { ContentPurpose } from '@shared/domain'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { useProjectSummaries } from '@/features/project/api/projectQueries'
import { ProjectGrid } from '@/features/project/components/ProjectGrid'
import { PurposeFilter } from '@/features/project/components/PurposeFilter'
import { isContentPurpose } from '@/features/project/model/purpose'

const PAGE_SIZE = 20

export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const rawPurpose = params.get('purpose')
  const purpose = isContentPurpose(rawPurpose) ? rawPurpose : undefined
  const page = Math.max(1, Number(params.get('page')) || 1)

  const data = useProjectSummaries({ offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, purpose })
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  const update = (next: { purpose?: ContentPurpose; page?: number }) => {
    const sp = new URLSearchParams()
    if (next.purpose) sp.set('purpose', next.purpose)
    if (next.page && next.page > 1) sp.set('page', String(next.page))
    setParams(sp)
  }

  return (
    <>
      <PageHeader title="내 콘텐츠" description={data ? `총 ${data.total}개` : undefined} />
      <div className="mb-4">
        <PurposeFilter value={purpose} onChange={(p) => update({ purpose: p })} />
      </div>
      {data && <ProjectGrid items={data.items} />}

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="페이지">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ purpose, page: page - 1 })}
            className="rounded-lg border bg-surface p-2 hover:bg-surface-hover disabled:opacity-40"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="font-mono text-body-sm text-ink-secondary">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => update({ purpose, page: page + 1 })}
            className="rounded-lg border bg-surface p-2 hover:bg-surface-hover disabled:opacity-40"
            aria-label="다음 페이지"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </>
  )
}
