import { ImageOff, Images, Pencil, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router'
import { useImageUrl } from '@/features/image/api/useImageUrl'
import { formatRelative } from '@/lib/format'
import type { ContentKind, ProjectSummary } from '../api/projectQueries'
import { PURPOSE_LABEL } from '../model/purpose'

const KIND_LABEL: Record<ContentKind, string> = {
  story: 'Story',
  blog: 'Blog',
  instagram: 'Instagram',
  facebook: 'Facebook',
  carousel: 'Carousel',
}

interface ProjectCardProps {
  summary: ProjectSummary
  onDelete: (summary: ProjectSummary) => void
}

export const ProjectCard = memo(function ProjectCard({ summary, onDelete }: ProjectCardProps) {
  const { project, imageCount, cover, contents } = summary
  const coverUrl = useImageUrl(cover)
  const href = project.status === 'generated' ? `/projects/${project.id}/result` : `/projects/${project.id}`
  const title = project.title.trim() || '제목 없는 콘텐츠'

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-surface shadow-e1 transition-shadow hover:shadow-e2">
      <Link to={href} className="relative block aspect-[4/3] bg-surface-hover" tabIndex={-1} aria-hidden="true">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            width={cover?.width ?? undefined}
            height={cover?.height ?? undefined}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-ink-muted">
            <ImageOff className="size-6" aria-hidden="true" />
          </span>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-lg bg-ink/70 px-2 py-0.5 text-badge text-ink-inverse">
          <Images className="size-3" aria-hidden="true" />
          {imageCount}장
        </span>
        <span className="absolute bottom-2 left-2 rounded-lg bg-primary px-2 py-0.5 text-badge text-primary-foreground">
          {project.purpose === 'other' && project.purposeDetail
            ? project.purposeDetail
            : PURPOSE_LABEL[project.purpose]}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate text-h3" title={title}>
          <Link to={href} className="hover:underline">
            {title}
          </Link>
        </h3>
        <p className="text-body-sm text-ink-muted">
          {project.status === 'generated' ? '생성됨' : '작성 중'} · {formatRelative(project.updatedAt)}
        </p>
        <div className="flex min-h-5 flex-wrap gap-1">
          {contents.map((k) => (
            <span key={k} className="rounded-md bg-surface-hover px-1.5 py-0.5 text-badge text-ink-secondary">
              {KIND_LABEL[k]}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Link
            to={href}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-hover py-2 font-semibold hover:bg-primary-light hover:text-primary-dark"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            편집하기
          </Link>
          <button
            type="button"
            onClick={() => onDelete(summary)}
            aria-label={`${title} 삭제`}
            className="rounded-lg p-2 text-ink-muted hover:bg-danger-bg hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
})
