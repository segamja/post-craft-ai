import type { ContentBlock, UUID } from '@shared/domain'
import { ArrowDown, ArrowUp, Heading, ImagePlus, ImageOff, Pilcrow, Replace, Trash2 } from 'lucide-react'
import { memo, useState, type DragEvent } from 'react'
import { useImageUrl } from '@/features/image/api/useImageUrl'
import { imageMeta, useResult } from '@/features/result/ResultContext'
import { newId } from '@/lib/db/time'
import { cn } from '@/lib/utils'
import { AutoTextarea } from './fields'
import { ImagePicker } from './ImagePicker'

/** 사진 패널에서 끌어올 때 쓰는 dataTransfer 형식 */
export const IMAGE_DRAG_TYPE = 'application/x-postcraft-image'

const hasImageDrag = (e: DragEvent) => e.dataTransfer.types.includes(IMAGE_DRAG_TYPE)

const ctrl = 'rounded-md p-1 text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-30'

function ImageBlockView({ imageId, caption, onCaption, onChangeImage }: {
  imageId: UUID
  caption: string | null
  onCaption: (c: string | null) => void
  onChangeImage: () => void
}) {
  const { images, analyses } = useResult()
  const meta = imageMeta(images, analyses, imageId)
  const url = useImageUrl(meta.image)
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative overflow-hidden rounded-xl bg-surface-hover">
        {url ? (
          <img src={url} alt={meta.alt} className="max-h-[480px] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-ink-muted">
            <ImageOff className="size-6" aria-hidden="true" />
          </div>
        )}
        {meta.alias && (
          <span className="absolute bottom-2 left-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-badge text-ink-inverse">
            {meta.alias}
          </span>
        )}
        <button
          type="button"
          onClick={onChangeImage}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-surface/90 px-2 py-1 text-body-sm hover:bg-surface"
        >
          <Replace className="size-3.5" aria-hidden="true" />
          사진 변경
        </button>
      </div>
      <input
        value={caption ?? ''}
        onChange={(e) => onCaption(e.target.value || null)}
        placeholder="사진 설명 (선택)"
        aria-label="사진 설명"
        className="bg-transparent text-center text-body-sm text-ink-secondary focus:outline-none"
      />
    </figure>
  )
}

const BlockRow = memo(function BlockRow({
  block,
  first,
  last,
  onChange,
  onMove,
  onRemove,
  onDropImage,
  onPickImage,
}: {
  block: ContentBlock
  first: boolean
  last: boolean
  onChange: (b: ContentBlock) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
  onDropImage: (imageId: UUID) => void
  onPickImage: () => void
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        if (!hasImageDrag(e)) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        const id = e.dataTransfer.getData(IMAGE_DRAG_TYPE)
        if (id) {
          e.preventDefault()
          onDropImage(id)
        }
      }}
      className={cn(
        'group relative -mx-3 rounded-lg px-3 py-1 focus-within:bg-background hover:bg-background',
        over && 'after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:bg-primary',
      )}
    >
      {block.type === 'heading' && (
        <AutoTextarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          aria-label={`소제목 (H${block.level})`}
          placeholder="소제목"
          className={block.level === 2 ? 'text-h2' : 'text-h3'}
        />
      )}
      {block.type === 'paragraph' && (
        <AutoTextarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          aria-label="문단"
          placeholder="문단을 입력하세요"
          className="text-body-lg"
        />
      )}
      {block.type === 'image' && (
        <ImageBlockView
          imageId={block.imageId}
          caption={block.caption}
          onCaption={(caption) => onChange({ ...block, caption })}
          onChangeImage={onPickImage}
        />
      )}

      <div className="absolute top-1 -right-2 z-10 hidden translate-x-full flex-col rounded-lg border bg-surface shadow-e1 group-focus-within:flex group-hover:flex">
        {block.type === 'heading' && (
          <button
            type="button"
            className={ctrl}
            onClick={() => onChange({ ...block, level: block.level === 2 ? 3 : 2 })}
            aria-label={`H${block.level === 2 ? 3 : 2}로 바꾸기`}
            title={`H${block.level === 2 ? 3 : 2}로 바꾸기`}
          >
            <span className="font-mono text-badge">H{block.level}</span>
          </button>
        )}
        <button type="button" className={ctrl} disabled={first} onClick={() => onMove(-1)} aria-label="위로">
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={ctrl} disabled={last} onClick={() => onMove(1)} aria-label="아래로">
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={cn(ctrl, 'hover:text-danger')} onClick={onRemove} aria-label="블록 삭제">
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
})

/** 블록 편집기 (명세 §6.2): 소제목 / 문단 / 사진. 사진 패널에서 끌어다 놓으면 그 아래에 사진이 들어간다 */
export function BlockEditor({ blocks, onChange }: { blocks: ContentBlock[]; onChange: (blocks: ContentBlock[]) => void }) {
  const { images } = useResult()
  // 사진 선택 대상: { index: 바꿀 블록 } 또는 { insertAt: 새로 넣을 위치 }
  const [picker, setPicker] = useState<{ index: number } | { insertAt: number } | null>(null)

  const set = (i: number, b: ContentBlock) => onChange(blocks.map((x, j) => (j === i ? b : x)))
  const insert = (at: number, b: ContentBlock) => onChange([...blocks.slice(0, at), b, ...blocks.slice(at)])
  const move = (i: number, delta: -1 | 1) => {
    const next = [...blocks]
    const [b] = next.splice(i, 1)
    next.splice(i + delta, 0, b!)
    onChange(next)
  }
  const imageBlock = (imageId: UUID): ContentBlock => ({ id: newId(), type: 'image', imageId, caption: null })

  const [overEnd, setOverEnd] = useState(false)
  const selectedImage =
    picker && 'index' in picker ? ((blocks[picker.index] as Extract<ContentBlock, { type: 'image' }>)?.imageId ?? null) : null

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <BlockRow
          key={b.id}
          block={b}
          first={i === 0}
          last={i === blocks.length - 1}
          onChange={(nb) => set(i, nb)}
          onMove={(d) => move(i, d)}
          onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
          onDropImage={(id) => insert(i + 1, imageBlock(id))}
          onPickImage={() => setPicker({ index: i })}
        />
      ))}

      <div
        onDragOver={(e) => {
          if (!hasImageDrag(e)) return
          e.preventDefault()
          setOverEnd(true)
        }}
        onDragLeave={() => setOverEnd(false)}
        onDrop={(e) => {
          setOverEnd(false)
          const id = e.dataTransfer.getData(IMAGE_DRAG_TYPE)
          if (id) {
            e.preventDefault()
            insert(blocks.length, imageBlock(id))
          }
        }}
        className={cn(
          'flex flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed py-3',
          overEnd && 'border-primary bg-primary-light',
        )}
      >
        <span className="text-body-sm text-ink-muted">블록 추가</span>
        <button
          type="button"
          onClick={() => insert(blocks.length, { id: newId(), type: 'paragraph', text: '' })}
          className="inline-flex items-center gap-1 rounded-full border bg-surface px-3 py-1 text-body-sm hover:bg-surface-hover"
        >
          <Pilcrow className="size-3.5" aria-hidden="true" />
          문단
        </button>
        <button
          type="button"
          onClick={() => insert(blocks.length, { id: newId(), type: 'heading', level: 2, text: '' })}
          className="inline-flex items-center gap-1 rounded-full border bg-surface px-3 py-1 text-body-sm hover:bg-surface-hover"
        >
          <Heading className="size-3.5" aria-hidden="true" />
          소제목
        </button>
        <button
          type="button"
          onClick={() => setPicker({ insertAt: blocks.length })}
          className="inline-flex items-center gap-1 rounded-full border bg-surface px-3 py-1 text-body-sm hover:bg-surface-hover"
        >
          <ImagePlus className="size-3.5" aria-hidden="true" />
          사진
        </button>
      </div>

      <ImagePicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        title={picker && 'index' in picker ? '사진 변경' : '사진 넣기'}
        images={images}
        selected={selectedImage}
        onSelect={(id) => {
          if (!picker || !id) return
          if ('index' in picker) {
            const b = blocks[picker.index]
            if (b?.type === 'image') set(picker.index, { ...b, imageId: id })
          } else insert(picker.insertAt, imageBlock(id))
        }}
      />
    </div>
  )
}
