import { isPlatformStale, isStoryStale, isUserEdited, type Platform } from '@shared/domain'
import { ERROR_MESSAGES, isAppError } from '@shared/errorCodes'
import { ArrowLeft, ImageUp, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { reconcileInterruptedJobs } from '@/features/ai/api/aiJobRepo'
import { useGenerationProgress } from '@/features/ai/api/progressQueries'
import { GenerationProgress } from '@/features/ai/components/GenerationProgress'
import { regenerateUnit } from '@/features/ai/pipeline'
import { startGeneration } from '@/features/ai/startGeneration'
import { CarouselEditor } from '@/features/carousel/components/CarouselEditor'
import { ContentSync } from '@/features/editor/ContentSync'
import { PlatformEditor } from '@/features/platform/components/PlatformEditor'
import { parseResultTab, RESULT_TABS, type ResultTab } from '@/features/platform/model/resultTab'
import { useProject } from '@/features/project/api/projectQueries'
import { PhotoPanel } from '@/features/result/PhotoPanel'
import { ResultContext, type ResultContextValue } from '@/features/result/ResultContext'
import { useResultData } from '@/features/result/resultQueries'
import { StoryEditor } from '@/features/story/components/StoryEditor'
import { toast } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { NotFoundPage } from './NotFoundPage'

const TAB_LABEL: Record<ResultTab, string> = {
  story: 'Story',
  blog: 'Blog',
  instagram: 'Instagram',
  facebook: 'Facebook',
  carousel: 'Carousel',
}

/** 사진 구성이 바뀌었을 때 (명세 §4.2, §9.3): 자동 재생성하지 않고 묻는다 */
function StoryStaleBanner({ ctx }: { ctx: ResultContextValue }) {
  const [confirm, setConfirm] = useState(false)
  const story = ctx.story!
  const run = async () => {
    try {
      await regenerateUnit(ctx.project.id, 'story')
      toast('새 사진으로 Story를 다시 만들었어요.')
    } catch (e) {
      toast(isAppError(e) ? ERROR_MESSAGES[e.code] : '다시 생성하지 못했어요.', 'error')
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stale bg-warning-bg px-4 py-3">
      <p className="flex items-center gap-2">
        <ImageUp className="size-4 text-warning" aria-hidden="true" />
        사진이 변경되었습니다. Story를 다시 생성하시겠어요?
      </p>
      <button
        type="button"
        onClick={() => (isUserEdited(story) ? setConfirm(true) : void run())}
        className="rounded-lg bg-surface px-3 py-1.5 font-semibold hover:bg-surface-hover"
      >
        Story 다시 생성
      </button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="다시 생성할까요?"
        description="직접 수정한 내용이 새로 생성된 내용으로 바뀝니다. 계속할까요?"
        confirmLabel="다시 생성"
        onConfirm={() => void run()}
      />
    </div>
  )
}

function EmptyTab({ ctx, tab }: { ctx: ResultContextValue; tab: ResultTab }) {
  const progress = useGenerationProgress(ctx.project.id)
  const unitKey = tab === 'story' ? 'story' : tab
  const status = progress?.units.find((u) => u.key === unitKey)?.status
  return (
    <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
      {status === 'generating' ? (
        <p className="text-ink-secondary">{TAB_LABEL[tab]}을(를) 만들고 있어요…</p>
      ) : (
        <>
          <p className="text-ink-secondary">아직 {TAB_LABEL[tab]}이(가) 없어요.</p>
          <button
            type="button"
            onClick={() => void startGeneration(ctx.project.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            빈 콘텐츠 생성하기
          </button>
        </>
      )}
    </div>
  )
}

function TabBody({ ctx, tab }: { ctx: ResultContextValue; tab: ResultTab }) {
  if (tab === 'carousel') {
    if (!ctx.carousel) return <EmptyTab ctx={ctx} tab={tab} />
    return (
      <ContentSync entity={ctx.carousel}>
        {(sync) => <CarouselEditor carousel={ctx.carousel!} {...sync} />}
      </ContentSync>
    )
  }

  let editor
  if (tab === 'story') {
    editor = ctx.story && (
      <ContentSync entity={ctx.story}>{(sync) => <StoryEditor story={ctx.story!} {...sync} />}</ContentSync>
    )
  } else {
    const content = ctx.platforms.find((p) => p.platform === tab)
    editor = content && (
      <ContentSync entity={content}>{(sync) => <PlatformEditor content={content} {...sync} />}</ContentSync>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
      <div className="order-2 lg:order-none">
        <PhotoPanel canDrag={tab === 'story' || tab === 'blog'} />
      </div>
      {editor ?? <EmptyTab ctx={ctx} tab={tab} />}
    </div>
  )
}

/** 결과·편집 화면 (명세 §13.6, 디자인 story_result_workspace) */
export function ProjectResultPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = parseResultTab(params.get('tab'))
  const project = useProject(id)
  const data = useResultData(id)
  const progress = useGenerationProgress(id)

  // 새로고침·창 닫힘으로 끊긴 생성 작업을 "중단됨"으로 정리해 다시 시도할 수 있게 한다
  useEffect(() => {
    void reconcileInterruptedJobs(id)
  }, [id])

  if (project === undefined || data === undefined) return null
  if (project === null) return <NotFoundPage />

  const ctx: ResultContextValue = { ...data, project }
  const stale = (p: Platform) => {
    const c = data.platforms.find((x) => x.platform === p)
    return !!(c && data.story && isPlatformStale(c, data.story))
  }
  const showProgress = progress && (progress.anyRunning || progress.anyFailed || progress.units.some((u) => u.status !== 'ready'))

  return (
    <ResultContext.Provider value={ctx}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h1">{project.title.trim() || data.story?.title || '제목 없는 콘텐츠'}</h1>
          <Link to={`/projects/${id}`} className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            사진·설명 수정
          </Link>
        </div>

        {showProgress && <GenerationProgress projectId={id} />}
        {data.story && isStoryStale(data.story, project) && <StoryStaleBanner ctx={ctx} />}

        <div role="tablist" aria-label="콘텐츠 종류" className="flex gap-1 overflow-x-auto border-b">
          {RESULT_TABS.map((t) => {
            const isStale = t !== 'story' && t !== 'carousel' && stale(t)
            return (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={t === tab}
                onClick={() => setParams(t === 'story' ? {} : { tab: t }, { replace: true })}
                title={isStale ? 'Story 원본이 수정되었습니다. 내용을 갱신해보세요' : undefined}
                className={cn(
                  '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 font-semibold transition-colors',
                  t === tab ? 'border-primary text-primary' : 'border-transparent text-ink-secondary hover:text-ink',
                )}
              >
                {TAB_LABEL[t]}
                {isStale && (
                  <>
                    <span className="size-1.5 rounded-full bg-stale" aria-hidden="true" />
                    <span className="sr-only">(업데이트 필요)</span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
          <TabBody ctx={ctx} tab={tab} />
        </div>
      </div>
    </ResultContext.Provider>
  )
}
