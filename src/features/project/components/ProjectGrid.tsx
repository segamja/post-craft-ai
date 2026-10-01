import { FolderPlus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import type { ProjectSummary } from '../api/projectQueries'
import { deleteProject } from '../api/projectRepo'
import { ProjectCard } from './ProjectCard'

export function ProjectGrid({ items }: { items: ProjectSummary[] }) {
  const [target, setTarget] = useState<ProjectSummary | null>(null)
  const handleDelete = useCallback((s: ProjectSummary) => setTarget(s), [])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-14 text-center">
        <FolderPlus className="size-8 text-ink-muted" aria-hidden="true" />
        <p className="text-h3">아직 만든 콘텐츠가 없어요</p>
        <p className="text-ink-secondary">사진 몇 장과 짧은 설명으로 첫 콘텐츠를 만들어보세요.</p>
        <Link
          to="/projects/new"
          className="mt-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          새 콘텐츠 만들기
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((s) => (
          <ProjectCard key={s.project.id} summary={s} onDelete={handleDelete} />
        ))}
      </div>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="이 콘텐츠를 삭제할까요?"
        description="사진과 생성된 모든 결과가 함께 삭제되며 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          if (target) void deleteProject(target.project.id)
          setTarget(null)
        }}
      />
    </>
  )
}
