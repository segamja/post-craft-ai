import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import type { UserImage, UUID } from '@shared/domain'
import { ERROR_MESSAGES, isAppError } from '@shared/errorCodes'
import { IMAGE_RULES } from '@shared/platformRules'
import { CloudUpload, ImageIcon, Plus, ShieldCheck } from 'lucide-react'
import { useCallback, useRef, useState, type DragEvent } from 'react'
import { toast, useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { deleteImage, reorderImages } from '../api/imageRepo'
import { replaceWithFile, retryUpload, uploadFiles, type UploadOptions } from '../lib/uploadFiles'
import { UnsplashDialog } from '@/features/unsplash/components/UnsplashDialog'
import { ImageThumb } from './ImageThumb'

const ACCEPT = [...IMAGE_RULES.acceptedMimeTypes, '.heic', '.heif'].join(',')

interface ImageUploaderProps {
  projectId: UUID
  images: UserImage[]
}

const opts: UploadOptions = {
  onReserved: (id, file) => useUiStore.getState().setUploadFile(id, file),
  onFailed: (id, code) => useUiStore.getState().setUploadError(id, code),
  onSucceeded: (id) => useUiStore.getState().forgetUpload(id),
}

export function ImageUploader({ projectId, images }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<UserImage | null>(null)
  const [dragging, setDragging] = useState(false)
  const [unsplashOpen, setUnsplashOpen] = useState(false)
  // 정렬 직후 DB 반영 전까지 화면 순서를 유지 (images가 새로 들어오면 자동으로 무효)
  const [optimistic, setOptimistic] = useState<{ base: UserImage[]; ids: UUID[] } | null>(null)
  const shown =
    optimistic && optimistic.base === images
      ? optimistic.ids.map((id) => images.find((i) => i.id === id)!)
      : images
  const full = images.length >= IMAGE_RULES.maxPerProject

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorder = useCallback(
    async (ids: UUID[]) => {
      setOptimistic({ base: images, ids })
      try {
        await reorderImages(projectId, ids)
      } catch (e) {
        setOptimistic(null)
        toast(isAppError(e) ? e.message : '순서를 바꾸지 못했어요.', 'error')
      }
    },
    [images, projectId],
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = shown.map((i) => i.id)
    void reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  const handleMove = useCallback(
    (image: UserImage, delta: -1 | 1) => {
      const ids = shown.map((i) => i.id)
      const from = ids.indexOf(image.id)
      const to = from + delta
      if (to < 0 || to >= ids.length) return
      void reorder(arrayMove(ids, from, to))
    },
    [shown, reorder],
  )

  const handleReplace = useCallback((image: UserImage) => {
    replaceTarget.current = image
    replaceInputRef.current?.click()
  }, [])

  const onReplaceFile = async (file: File) => {
    const target = replaceTarget.current
    replaceTarget.current = null
    if (!target) return
    const { setReplacing } = useUiStore.getState()
    setReplacing(target.id, true)
    try {
      await replaceWithFile(target.id, projectId, file)
    } catch (e) {
      toast(isAppError(e) ? e.message : '사진을 교체하지 못했어요.', 'error')
    } finally {
      setReplacing(target.id, false)
    }
  }

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list)
      if (files.length === 0) return
      try {
        const { rejected, overflow } = await uploadFiles(projectId, files, opts)
        for (const { file, code } of rejected) toast(`${file.name}: ${ERROR_MESSAGES[code]}`, 'error')
        if (overflow.length > 0)
          toast(`${ERROR_MESSAGES.IMAGE_LIMIT_EXCEEDED} (${overflow.length}장은 추가하지 않았어요)`, 'error')
      } catch (e) {
        toast(isAppError(e) ? e.message : '사진을 추가하지 못했어요.', 'error')
      }
    },
    [projectId],
  )

  const handleDelete = useCallback(async (image: UserImage) => {
    await deleteImage(image.id)
    useUiStore.getState().forgetUpload(image.id)
  }, [])

  const handleRetry = useCallback(
    (image: UserImage) => {
      const file = useUiStore.getState().uploadFiles[image.id]
      if (!file) return
      useUiStore.getState().setUploadError(image.id, null)
      void retryUpload(image.id, file, opts)
    },
    [],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!full) void addFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!full) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-background px-6 py-8 text-center transition-colors',
          dragging && 'border-primary bg-primary-light',
          full && 'opacity-60',
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-surface text-primary shadow-e1">
          <CloudUpload className="size-5" aria-hidden="true" />
        </span>
        <p className="text-body-lg">
          사진을 이곳에 끌어다 놓거나{' '}
          <button
            type="button"
            disabled={full}
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-primary underline-offset-2 hover:underline disabled:no-underline"
          >
            컴퓨터에서 선택
          </button>
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-body-sm text-ink-secondary">
          <span>JPG, PNG, WebP, HEIC · 파일당 최대 20MB</span>
          <span className="inline-flex items-center gap-1 text-success">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            위치정보(GPS) 자동 제거
          </span>
        </p>
        <button
          type="button"
          disabled={full}
          onClick={() => setUnsplashOpen(true)}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border bg-surface px-3 py-1.5 text-body-sm hover:bg-surface-hover disabled:opacity-40"
        >
          <ImageIcon className="size-3.5" aria-hidden="true" />
          Unsplash에서 보조 이미지 찾기
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          data-testid="image-input"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept={ACCEPT}
          hidden
          data-testid="replace-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onReplaceFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex justify-between text-body-sm text-ink-secondary">
            <span>사진 순서 ({images.length}장) · 끌어서 순서를 바꿀 수 있어요</span>
            <span>첫 번째 사진이 대표 이미지가 됩니다</span>
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={shown.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
              <ul className="flex gap-3 overflow-x-auto pb-2" aria-label="업로드한 사진">
                {shown.map((img, i) => (
                  <ImageThumb
                    key={img.id}
                    image={img}
                    index={i}
                    count={shown.length}
                    onDelete={handleDelete}
                    onRetry={handleRetry}
                    onReplace={handleReplace}
                    onMove={handleMove}
                  />
                ))}
                {!full && (
                  <li className="w-32 shrink-0">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-surface text-ink-secondary hover:bg-surface-hover"
                    >
                      <Plus className="size-5 text-primary" aria-hidden="true" />
                      사진 추가
                      <span className="font-mono text-body-sm text-ink-muted">
                        {images.length} / {IMAGE_RULES.maxPerProject}
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}
      <UnsplashDialog
        projectId={projectId}
        open={unsplashOpen}
        onOpenChange={setUnsplashOpen}
        remaining={IMAGE_RULES.maxPerProject - images.length}
      />
    </div>
  )
}
