import { isPlatformStale, PLATFORMS, type ContentStory } from '@shared/domain'
import { Code, FileText, Hash } from 'lucide-react'
import { useCallback } from 'react'
import type { SyncProps } from '@/features/editor/ContentSync'
import { BlockEditor } from '@/features/editor/BlockEditor'
import { AutoTextarea, CharCount } from '@/features/editor/fields'
import { useContentDraft } from '@/features/editor/useContentDraft'
import { blocksToHtml, blocksToMarkdown, blocksToText } from '@/features/result/exportFormats'
import { CopyPanel, Section, UnitActions, VerificationPanel } from '@/features/result/Inspector'
import { useResult } from '@/features/result/ResultContext'
import { cn } from '@/lib/utils'
import { revertStory, saveStoryEdit, type StoryContent } from '../api/storyRepo'

const toDraft = (s: ContentStory): StoryContent => ({
  title: s.title,
  summary: s.summary,
  blocks: s.blocks,
  verificationItems: s.verificationItems,
})

const PLATFORM_LABEL = { blog: '블로그', instagram: '인스타그램', facebook: '페이스북' } as const

/** Story 편집 (명세 §9, 디자인 story_result_workspace 중앙 + 우측) */
export function StoryEditor({ story, register, onConflict }: { story: ContentStory } & SyncProps) {
  const ctx = useResult()
  const save = useCallback(
    (d: StoryContent, lastKnown: string) => saveStoryEdit(story.id, d, lastKnown),
    [story.id],
  )
  const { draft, update, flush } = useContentDraft({ entity: story, toDraft, save, onConflict, register })
  const text = draft.blocks.map((b) => (b.type === 'image' ? '' : b.text)).join('')

  return (
    <>
      <article className="flex min-w-0 flex-col gap-5 rounded-xl border bg-surface p-6 shadow-e1 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-primary-light px-2 py-0.5 text-badge text-primary-dark">SOURCE STORY · 원본</span>
          <span className="font-mono text-body-sm text-ink-muted">
            본문 {text.length.toLocaleString()}자 · v{story.version}
          </span>
        </div>
        <AutoTextarea
          value={draft.title}
          maxLength={80}
          onChange={(e) => update({ title: e.target.value })}
          aria-label="Story 제목"
          placeholder="제목"
          className="text-display"
        />
        <div className="rounded-xl bg-surface-hover p-4">
          <AutoTextarea
            value={draft.summary}
            maxLength={300}
            onChange={(e) => update({ summary: e.target.value })}
            aria-label="요약"
            placeholder="요약"
            className="text-ink-secondary"
          />
          <div className="text-right">
            <CharCount value={draft.summary} max={300} />
          </div>
        </div>
        <BlockEditor blocks={draft.blocks} onChange={(blocks) => update({ blocks })} />
      </article>

      <aside className="flex flex-col gap-4">
        <VerificationPanel items={draft.verificationItems} onChange={(verificationItems) => update({ verificationItems })} />
        <UnitActions unit="story" entity={story} beforeRegenerate={flush} revert={() => revertStory(story.id)} />
        <CopyPanel
          options={[
            { label: '일반 텍스트', icon: FileText, get: () => [draft.title, draft.summary, blocksToText(draft.blocks, ctx)].join('\n\n') },
            { label: 'Markdown', icon: Hash, get: () => [`# ${draft.title}`, draft.summary, blocksToMarkdown(draft.blocks, ctx)].join('\n\n') },
            { label: 'HTML', icon: Code, get: () => [`<h1>${draft.title}</h1>`, `<p>${draft.summary}</p>`, blocksToHtml(draft.blocks, ctx)].join('\n') },
          ]}
        />
        <Section title="채널별 변환 상태">
          <ul className="flex flex-col gap-1.5 text-body-sm">
            {PLATFORMS.map((p) => {
              const c = ctx.platforms.find((x) => x.platform === p)
              const status = !c ? '대기' : isPlatformStale(c, story) ? '반영 필요' : '최신'
              return (
                <li key={p} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        status === '최신' ? 'bg-success' : status === '반영 필요' ? 'bg-stale' : 'bg-ink-muted',
                      )}
                    />
                    {PLATFORM_LABEL[p]}
                  </span>
                  <span className={cn(status === '반영 필요' ? 'font-semibold text-warning' : 'text-ink-secondary')}>{status}</span>
                </li>
              )
            })}
          </ul>
        </Section>
      </aside>
    </>
  )
}
