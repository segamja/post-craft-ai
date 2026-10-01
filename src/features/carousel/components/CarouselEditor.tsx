import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CAROUSEL_RULES } from '@shared/platformRules'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, GripVertical, ImageOff, Plus, Replace, Trash2 } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import type { SyncProps } from '@/features/editor/ContentSync'
import { AutoTextarea, CharCount } from '@/features/editor/fields'
import { ImagePicker } from '@/features/editor/ImagePicker'
import { useContentDraft } from '@/features/editor/useContentDraft'
import { useImageUrl } from '@/features/image/api/useImageUrl'
import { CopyPanel, UnitActions } from '@/features/result/Inspector'
import { imageMeta, useResult } from '@/features/result/ResultContext'
import { newId } from '@/lib/db/time'
import { cn } from '@/lib/utils'
import { revertCarousel, saveCarouselEdit, type CarouselView, type SlideInput } from '../api/carouselRepo'

type Slide = Required<Pick<SlideInput, 'id'>> & Omit<SlideInput, 'id'>
type Ratio = '1:1' | '4:5'

const toDraft = (c: CarouselView): { slides: Slide[] } => ({
  slides: c.slides.map(({ id, imageId, title, body }) => ({ id, imageId, title, body })),
})

function SlideImage({ imageId, className }: { imageId: string | null; className?: string }) {
  const { images, analyses } = useResult()
  const meta = imageMeta(images, analyses, imageId)
  const url = useImageUrl(meta.image)
  return url ? <img src={url} alt={meta.alt} className={cn('object-cover', className)} /> : null
}

/** 프리뷰: 이미지 위 하단 오버레이. 이미지가 없으면 텍스트 카드 (명세 §11) */
function SlidePreview({ slide, ratio, index, count }: { slide: Slide; ratio: Ratio; index: number; count: number }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-primary-dark shadow-e2',
        ratio === '1:1' ? 'aspect-square' : 'aspect-[4/5]',
      )}
    >
      <SlideImage imageId={slide.imageId} className="absolute inset-0 size-full" />
      <span className="absolute top-3 right-3 rounded-full bg-ink/60 px-2 py-0.5 font-mono text-badge text-ink-inverse">
        {index + 1} / {count}
      </span>
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-ink-inverse',
          slide.imageId ? 'bg-gradient-to-t from-black/75 via-black/40 to-transparent pt-16' : 'top-0 justify-center text-center',
        )}
      >
        <p className="text-[22px] leading-snug font-bold">{slide.title || '제목 없음'}</p>
        {slide.body && <p className="text-body-lg whitespace-pre-line opacity-90">{slide.body}</p>}
      </div>
    </div>
  )
}

const SlideItem = memo(function SlideItem({
  slide,
  index,
  count,
  active,
  onSelect,
  onMove,
}: {
  slide: Slide
  index: number
  count: number
  active: boolean
  onSelect: () => void
  onMove: (delta: -1 | 1) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-xl border bg-surface p-2',
        active && 'border-primary ring-1 ring-primary',
        isDragging && 'z-10 shadow-floating',
      )}
    >
      <button type="button" {...attributes} {...listeners} aria-label={`슬라이드 ${index + 1} 순서 바꾸기`} className="cursor-grab touch-none text-ink-muted">
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-current={active}>
        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-primary-dark">
          <SlideImage imageId={slide.imageId} className="size-full" />
          <span className="absolute top-0.5 left-0.5 rounded bg-ink/70 px-1 font-mono text-badge text-ink-inverse">{index + 1}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{slide.title || '제목 없음'}</span>
          <span className="block truncate text-body-sm text-ink-secondary">
            {index === 0 ? '표지' : slide.imageId ? '사진 슬라이드' : '텍스트 카드'}
          </span>
        </span>
      </button>
      <span className="flex flex-col">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="위로" className="text-ink-muted disabled:opacity-30">
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="아래로" className="text-ink-muted disabled:opacity-30">
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    </li>
  )
})

/** Carousel 편집 (명세 §13.7, 디자인 instagram_carousel_editor) */
export function CarouselEditor({ carousel, register, onConflict }: { carousel: CarouselView } & SyncProps) {
  const ctx = useResult()
  const save = useCallback(
    (d: { slides: Slide[] }, lastKnown: string) => saveCarouselEdit(carousel.id, d.slides, lastKnown),
    [carousel.id],
  )
  const { draft, update, flush } = useContentDraft({ entity: carousel, toDraft, save, onConflict, register })
  const { slides } = draft
  const [activeId, setActiveId] = useState(slides[0]?.id)
  const [ratio, setRatio] = useState<Ratio>('4:5')
  const [picking, setPicking] = useState(false)
  const activeIndex = Math.max(0, slides.findIndex((s) => s.id === activeId))
  const active = slides[activeIndex]!

  const setSlides = (next: Slide[]) => update({ slides: next })
  const patchActive = (p: Partial<Slide>) => setSlides(slides.map((s, i) => (i === activeIndex ? { ...s, ...p } : s)))
  const move = (from: number, to: number) => setSlides(arrayMove(slides, from, to))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    if (!over || a.id === over.id) return
    const ids = slides.map((s) => s.id)
    move(ids.indexOf(String(a.id)), ids.indexOf(String(over.id)))
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <section className="flex flex-col gap-3" aria-label="슬라이드 순서">
        <h2 className="text-h3">슬라이드 순서 <span className="text-body-sm font-normal text-ink-muted">끌어서 변경</span></h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2">
              {slides.map((s, i) => (
                <SlideItem
                  key={s.id}
                  slide={s}
                  index={i}
                  count={slides.length}
                  active={i === activeIndex}
                  onSelect={() => setActiveId(s.id)}
                  onMove={(d) => move(i, i + d)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          disabled={slides.length >= CAROUSEL_RULES.slidesMax}
          onClick={() => {
            const s: Slide = { id: newId(), imageId: null, title: '', body: '' }
            setSlides([...slides, s])
            setActiveId(s.id)
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 hover:bg-surface-hover disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />새 슬라이드 ({slides.length}/{CAROUSEL_RULES.slidesMax})
        </button>
      </section>

      <section className="flex flex-col items-center gap-3" aria-label="미리보기">
        <div className="flex w-full items-center justify-between">
          <div className="inline-flex rounded-lg bg-surface-hover p-1" role="radiogroup" aria-label="비율">
            {(['1:1', '4:5'] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={ratio === r}
                onClick={() => setRatio(r)}
                className={cn('rounded-md px-3 py-1 text-body-sm', ratio === r ? 'bg-surface font-semibold shadow-e1' : 'text-ink-secondary')}
              >
                {r === '1:1' ? '1:1 정사각' : '4:5 세로'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" disabled={activeIndex === 0} onClick={() => setActiveId(slides[activeIndex - 1]?.id)} aria-label="이전 슬라이드" className="rounded-full border bg-surface p-1.5 disabled:opacity-30">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" disabled={activeIndex === slides.length - 1} onClick={() => setActiveId(slides[activeIndex + 1]?.id)} aria-label="다음 슬라이드" className="rounded-full border bg-surface p-1.5 disabled:opacity-30">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="w-full max-w-md">
          <SlidePreview slide={active} ratio={ratio} index={activeIndex} count={slides.length} />
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s.id} className={cn('size-1.5 rounded-full', i === activeIndex ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="flex flex-col gap-4 rounded-xl border bg-surface p-4 shadow-e1">
          <h2 className="text-h3">슬라이드 {activeIndex + 1} 편집</h2>
          <div className="flex items-center gap-3">
            <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-hover text-ink-muted">
              {active.imageId ? <SlideImage imageId={active.imageId} className="size-full" /> : <ImageOff className="size-5" aria-hidden="true" />}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-body-sm text-ink-secondary">
                {imageMeta(ctx.images, ctx.analyses, active.imageId).alias ?? '이미지 없음 (텍스트 카드)'}
              </span>
              <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-body-sm hover:bg-surface-hover">
                <Replace className="size-3.5" aria-hidden="true" />
                {active.imageId ? '사진 변경' : '이미지 선택'}
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="flex justify-between text-body-sm font-semibold">
              슬라이드 제목 <CharCount value={active.title} max={CAROUSEL_RULES.titleMax} />
            </span>
            <input
              value={active.title}
              maxLength={CAROUSEL_RULES.titleMax}
              onChange={(e) => patchActive({ title: e.target.value })}
              className="rounded-lg border bg-surface px-3 py-2 focus:border-border-focus focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex justify-between text-body-sm font-semibold">
              본문 <CharCount value={active.body} max={CAROUSEL_RULES.bodyMax} />
            </span>
            <AutoTextarea
              value={active.body}
              maxLength={CAROUSEL_RULES.bodyMax}
              onChange={(e) => patchActive({ body: e.target.value })}
              className="min-h-24 rounded-lg border bg-surface px-3 py-2 focus:border-border-focus"
            />
          </label>
          <button
            type="button"
            disabled={slides.length <= CAROUSEL_RULES.slidesMin}
            onClick={() => {
              const next = slides.filter((_, i) => i !== activeIndex)
              setSlides(next)
              setActiveId(next[Math.max(0, activeIndex - 1)]?.id)
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-danger hover:bg-danger-bg disabled:opacity-30"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            이 슬라이드 삭제
          </button>
        </section>

        <UnitActions unit="carousel" entity={carousel} beforeRegenerate={flush} revert={() => revertCarousel(carousel.id)} />
        <CopyPanel
          options={[
            {
              label: '슬라이드 문구',
              get: () => slides.map((s, i) => `[${i + 1}] ${s.title}\n${s.body}`.trim()).join('\n\n'),
            },
          ]}
        />
      </aside>

      <ImagePicker
        open={picking}
        onOpenChange={setPicking}
        title={`슬라이드 ${activeIndex + 1} 사진`}
        images={ctx.images}
        selected={active.imageId}
        allowNone
        onSelect={(imageId) => patchActive({ imageId })}
      />
    </div>
  )
}
