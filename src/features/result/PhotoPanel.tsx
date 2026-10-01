import type { UserImage } from '@shared/domain'
import { Download, GripVertical, Images, Pencil } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router'
import { IMAGE_DRAG_TYPE } from '@/features/editor/BlockEditor'
import { useImageUrl } from '@/features/image/api/useImageUrl'
import { UnsplashCredit } from '@/features/unsplash/components/UnsplashCredit'
import { photoFileName } from './exportFormats'
import { useResult } from './ResultContext'

const PhotoItem = memo(function PhotoItem({ image, index, tags, canDrag }: { image: UserImage; index: number; tags: string[]; canDrag: boolean }) {
  const url = useImageUrl(image)
  const alias = `IMG${index + 1}`
  return (
    <li
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.setData(IMAGE_DRAG_TYPE, image.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="flex gap-2 rounded-xl border bg-surface p-2"
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
        {url && <img src={url} alt="" draggable={false} className="size-full object-cover" />}
        <span className="absolute top-0.5 left-0.5 rounded bg-ink/70 px-1 font-mono text-badge text-ink-inverse">{alias}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <span className="truncate text-body-sm font-semibold">{image.altText || image.fileName || alias}</span>
          {canDrag && <GripVertical className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />}
        </div>
        {tags.length > 0 && (
          <p className="line-clamp-2 text-badge font-normal text-ink-secondary">{tags.slice(0, 4).map((t) => `#${t}`).join(' ')}</p>
        )}
        {image.source === 'unsplash' ? (
          <UnsplashCredit image={image} className="text-badge" />
        ) : (
          url && (
            <a href={url} download={photoFileName(index)} className="inline-flex items-center gap-1 text-badge text-primary hover:underline">
              <Download className="size-3" aria-hidden="true" />
              {photoFileName(index)}
            </a>
          )
        )}
      </div>
    </li>
  )
})

/** 결과 화면 왼쪽: 프로젝트 사진 (명세 §13.6 "사진 패널 · 드래그로 블록 삽입") */
export function PhotoPanel({ canDrag }: { canDrag: boolean }) {
  const { project, images, analyses } = useResult()
  const ready = images.filter((i) => i.status === 'ready')

  return (
    <aside className="flex flex-col gap-3" aria-label="프로젝트 사진">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-h3">
          <Images className="size-4 text-primary" aria-hidden="true" />
          프로젝트 사진 <span className="font-mono text-body-sm text-ink-muted">{ready.length}</span>
        </h2>
        <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-body-sm text-ink-secondary hover:text-ink">
          <Pencil className="size-3" aria-hidden="true" />
          사진 관리
        </Link>
      </div>
      {canDrag && (
        <p className="rounded-lg bg-primary-light px-3 py-2 text-body-sm text-primary-dark">사진을 본문으로 끌어다 놓으면 그 위치에 들어가요.</p>
      )}
      <ul className="flex flex-col gap-2">
        {ready.map((img) => (
          <PhotoItem key={img.id} image={img} index={images.indexOf(img)} tags={analyses.get(img.id)?.tags ?? []} canDrag={canDrag} />
        ))}
      </ul>
      <p className="text-badge text-ink-muted">블로그에 올릴 때는 복사한 글의 사진n.jpg 자리에 내려받은 사진을 넣으세요.</p>
    </aside>
  )
}
