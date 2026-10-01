import type { ContentProject, UserImage } from '@shared/domain'
import { IMAGE_RULES, PROJECT_RULES } from '@shared/platformRules'
import { Lightbulb } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { ImageUploader } from '@/features/image/components/ImageUploader'
import { useAutosave } from '@/lib/useAutosave'
import { updateProject } from '../api/projectRepo'
import { getGenerateBlockers, type ProjectDraft } from '../model/readiness'
import { PurposeField, ToneField } from './PurposeToneFields'

function Step({ no, title, description, aside, children }: {
  no: string
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border bg-surface p-6 shadow-e1">
      <header className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-dark font-mono text-body-sm text-ink-inverse">
          {no}
        </span>
        <div className="flex-1">
          <h2 className="text-h2">{title}</h2>
          {description && <p className="text-ink-secondary">{description}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  )
}

const toDraft = (p: ContentProject): ProjectDraft => ({
  title: p.title,
  purpose: p.purpose,
  purposeDetail: p.purposeDetail,
  sourceDescription: p.sourceDescription,
  tone: p.tone,
})

interface ProjectInputFormProps {
  project: ContentProject
  images: UserImage[]
  onGenerate: () => void
}

/** 입력 단계 (명세 §13.4). 레이아웃: Stitch new_content */
export function ProjectInputForm({ project, images, onGenerate }: ProjectInputFormProps) {
  // 처음 불러온 값으로 초기화하고 이후로는 로컬 편집 버퍼가 기준 (자동 저장 대상)
  const [draft, setDraft] = useState(() => toDraft(project))
  const patch = (p: Partial<ProjectDraft>) => setDraft((d) => ({ ...d, ...p }))

  const save = useCallback((d: ProjectDraft) => updateProject(project.id, d), [project.id])
  const { flush } = useAutosave(draft, save)

  const blockers = getGenerateBlockers(draft, images)
  const readyCount = images.filter((i) => i.status === 'ready').length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-secondary">콘텐츠 이름 (선택)</span>
          <input
            value={draft.title}
            maxLength={80}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="예: 제주 애월 2박 3일 여행"
            className="rounded-lg border bg-surface px-3 py-2.5 text-h3 focus:border-border-focus focus:outline-none"
          />
        </label>

        <Step
          no="01"
          title="사진 올리기"
          description="사진 순서가 이야기의 흐름이 됩니다."
          aside={
            <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-badge text-primary-dark">
              권장 3장 이상 · 최대 {IMAGE_RULES.maxPerProject}장
            </span>
          }
        >
          <ImageUploader projectId={project.id} images={images} />
        </Step>

        <Step no="03" title="사진에 대해 알려주세요" description="언제, 누구와, 어떤 순간이었는지 편하게 적어주세요.">
          <div className="flex flex-col gap-1.5">
            <textarea
              value={draft.sourceDescription}
              maxLength={PROJECT_RULES.sourceDescriptionMax}
              onChange={(e) => patch({ sourceDescription: e.target.value })}
              rows={6}
              aria-label="사진 설명"
              placeholder="예: 2박 3일 동안 다녀온 제주 여행이에요. 첫날 애월 해변 카페에서 노을을 보며 커피를 마셨어요."
              className="resize-y rounded-xl border bg-background px-4 py-3 text-body-lg focus:border-border-focus focus:outline-none"
            />
            <p className="flex justify-between gap-4 text-body-sm text-ink-secondary">
              <span className="inline-flex items-center gap-1">
                <Lightbulb className="size-3.5" aria-hidden="true" />
                장소명, 느낀 감정, 날씨를 적을수록 더 생생한 글이 됩니다. 사진에 없는 정보는 AI가 지어내지 않아요.
              </span>
              <span className="shrink-0 font-mono">
                {draft.sourceDescription.length.toLocaleString()} / {PROJECT_RULES.sourceDescriptionMax.toLocaleString()}자
              </span>
            </p>
          </div>
        </Step>
      </div>

      <aside className="flex flex-col gap-6">
        <Step no="02" title="어떤 콘텐츠인가요?">
          <PurposeField
            purpose={draft.purpose}
            purposeDetail={draft.purposeDetail}
            onChange={(next) => patch(next)}
          />
          <ToneField tone={draft.tone} onChange={(tone) => patch({ tone })} />
        </Step>

        <section className="flex flex-col gap-4 rounded-xl border bg-surface p-6 shadow-e1 lg:sticky lg:top-20">
          <div>
            <p className="text-body-sm text-ink-secondary">만들어질 콘텐츠</p>
            <p className="mt-1">Story → Blog · Instagram · Facebook → Carousel</p>
          </div>
          <button
            type="button"
            disabled={blockers.length > 0}
            onClick={async () => {
              await flush()
              onGenerate()
            }}
            className="rounded-lg bg-primary px-4 py-3.5 text-h3 text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            AI로 콘텐츠 만들기{readyCount > 0 && ` (${readyCount}장)`}
          </button>
          {blockers.length > 0 ? (
            <ul className="flex flex-col gap-1 text-body-sm text-ink-secondary" aria-live="polite">
              {blockers.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          ) : (
            readyCount < 3 && (
              <p className="text-body-sm text-ink-secondary">사진이 3장 이상이면 더 풍부한 이야기가 만들어져요.</p>
            )
          )}
          <p className="text-body-sm text-ink-muted">입력한 내용은 자동으로 저장됩니다.</p>
        </section>
      </aside>
    </div>
  )
}
