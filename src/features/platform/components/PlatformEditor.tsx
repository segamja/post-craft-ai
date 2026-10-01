import { isPlatformStale, type Platform } from '@shared/domain'
import { PLATFORM_RULES } from '@shared/platformRules'
import { Code, FileText, Hash, ImageOff, Images, MessageSquareText, Replace } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { SyncProps } from '@/features/editor/ContentSync'
import { BlockEditor } from '@/features/editor/BlockEditor'
import { AutoTextarea, CharCount, HashtagEditor } from '@/features/editor/fields'
import { ImagePicker } from '@/features/editor/ImagePicker'
import { useContentDraft } from '@/features/editor/useContentDraft'
import { useImageUrl } from '@/features/image/api/useImageUrl'
import { PublishPanel, type PublishContent } from '@/features/publish/PublishPanel'
import { blocksToHtml, blocksToMarkdown, blocksToPasteHtml, blocksToText, captionText, hashtagLine } from '@/features/result/exportFormats'
import { CopyPanel, UnitActions, VerificationPanel, type CopyOption } from '@/features/result/Inspector'
import { imageMeta, useResult } from '@/features/result/ResultContext'
import {
  revertPlatform,
  savePlatformEdit,
  type PlatformContentInput,
  type PlatformContentView,
} from '../api/platformRepo'

const toDraft = (p: PlatformContentView): PlatformContentInput => ({
  title: p.title,
  blocks: p.blocks,
  caption: p.caption,
  hashtags: p.hashtags,
  coverImageId: p.coverImageId,
  mediaImageIds: p.mediaImageIds,
  verificationItems: p.verificationItems,
})

function SmallThumb({ id }: { id: string }) {
  const { images, analyses } = useResult()
  const meta = imageMeta(images, analyses, id)
  const url = useImageUrl(meta.image)
  return (
    <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-hover">
      {url && <img src={url} alt={meta.alt} className="size-full object-cover" />}
      {meta.alias && (
        <span className="absolute top-1 left-1 rounded bg-ink/70 px-1 font-mono text-badge text-ink-inverse">{meta.alias}</span>
      )}
    </span>
  )
}

function CoverField({ id, onPick }: { id: string | null; onPick: () => void }) {
  const { images, analyses } = useResult()
  const meta = imageMeta(images, analyses, id)
  const url = useImageUrl(meta.image)
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-hover">
      {url ? (
        <img src={url} alt={meta.alt} className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-1 text-ink-muted">
          <ImageOff className="size-6" aria-hidden="true" />
          커버 이미지 없음
        </div>
      )}
      <button
        type="button"
        onClick={onPick}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-surface/90 px-2 py-1 text-body-sm hover:bg-surface"
      >
        <Replace className="size-3.5" aria-hidden="true" />
        커버 변경
      </button>
    </div>
  )
}

const LABEL: Record<Platform, string> = { blog: 'Blog', instagram: 'Instagram', facebook: 'Facebook' }

/** 플랫폼별 편집 (명세 §11, D4) */
export function PlatformEditor({ content, register, onConflict }: { content: PlatformContentView } & SyncProps) {
  const ctx = useResult()
  const { platform } = content
  const save = useCallback(
    (d: PlatformContentInput, lastKnown: string) => savePlatformEdit(content.id, d, lastKnown),
    [content.id],
  )
  const { draft, update, flush } = useContentDraft({ entity: content, toDraft, save, onConflict, register })
  const [picker, setPicker] = useState<'cover' | 'media' | null>(null)
  const rules = PLATFORM_RULES[platform]
  const stale = ctx.story ? isPlatformStale(content, ctx.story) : false

  // SNS에 올릴 사진: Blog=커버+본문 사진, Instagram=Carousel 슬라이드 사진(없으면 전체), Facebook=첨부 사진
  const readyIds = ctx.images.filter((i) => i.status === 'ready').map((i) => i.id)
  const slideIds = ctx.carousel?.slides.flatMap((s) => (s.imageId ? [s.imageId] : [])) ?? []
  const publishImageIds =
    platform === 'blog'
      ? [...new Set([draft.coverImageId, ...draft.blocks.map((b) => (b.type === 'image' ? b.imageId : null))].filter((x): x is string => !!x))]
      : platform === 'instagram'
        ? [...new Set(slideIds.length ? slideIds : readyIds)]
        : draft.mediaImageIds
  const publishContent = (): PublishContent =>
    platform === 'blog'
      ? {
          title: draft.title ?? '',
          html: [blocksToPasteHtml(draft.blocks, ctx), draft.hashtags.length ? `<p>${hashtagLine(draft.hashtags)}</p>` : ''].join('\n'),
          text: [blocksToText(draft.blocks, ctx), hashtagLine(draft.hashtags)].filter(Boolean).join('\n\n'),
        }
      : { text: captionText(draft.caption ?? '', draft.hashtags, publishImageIds, ctx) }

  const copy: CopyOption[] =
    platform === 'blog'
      ? [
          { label: 'Markdown', icon: Hash, get: () => [`# ${draft.title ?? ''}`, blocksToMarkdown(draft.blocks, ctx), hashtagLine(draft.hashtags)].join('\n\n') },
          { label: 'HTML', icon: Code, get: () => [`<h1>${draft.title ?? ''}</h1>`, blocksToHtml(draft.blocks, ctx), `<p>${hashtagLine(draft.hashtags)}</p>`].join('\n') },
          { label: '일반 텍스트', icon: FileText, get: () => [draft.title ?? '', blocksToText(draft.blocks, ctx), hashtagLine(draft.hashtags)].join('\n\n') },
        ]
      : [
          {
            label: '캡션 + 해시태그',
            icon: MessageSquareText,
            get: () =>
              captionText(
                draft.caption ?? '',
                draft.hashtags,
                platform === 'facebook' ? draft.mediaImageIds : (ctx.carousel?.slides.flatMap((s) => (s.imageId ? [s.imageId] : [])) ?? []),
                ctx,
              ),
          },
          { label: '해시태그만', icon: Hash, get: () => hashtagLine(draft.hashtags) },
        ]

  return (
    <>
      <article className="flex min-w-0 flex-col gap-5 rounded-xl border bg-surface p-6 shadow-e1 sm:p-8">
        {platform === 'blog' && (
          <>
            <CoverField id={draft.coverImageId} onPick={() => setPicker('cover')} />
            <div>
              <AutoTextarea
                value={draft.title ?? ''}
                maxLength={PLATFORM_RULES.blog.titleMax}
                onChange={(e) => update({ title: e.target.value })}
                aria-label="블로그 제목"
                placeholder="제목"
                className="text-display"
              />
              <CharCount value={draft.title ?? ''} max={PLATFORM_RULES.blog.titleMax} />
            </div>
            <BlockEditor blocks={draft.blocks} onChange={(blocks) => update({ blocks })} />
            <p className="text-right">
              <CharCount
                value={draft.blocks.map((b) => (b.type === 'image' ? '' : b.text)).join('')}
                recommended={PLATFORM_RULES.blog.recommendedLength[1]}
              />
            </p>
          </>
        )}

        {platform !== 'blog' && (
          <div className="flex flex-col gap-2">
            <label htmlFor="caption" className="text-h3">
              {LABEL[platform]} 캡션
            </label>
            <AutoTextarea
              id="caption"
              value={draft.caption ?? ''}
              maxLength={platform === 'instagram' ? PLATFORM_RULES.instagram.captionMax : undefined}
              onChange={(e) => update({ caption: e.target.value })}
              className="min-h-48 rounded-xl border bg-background p-4 text-body-lg focus:border-border-focus"
            />
            <div className="flex flex-wrap justify-between gap-2">
              {platform === 'instagram' ? (
                <span className="text-body-sm text-ink-secondary">
                  피드에는 첫 {PLATFORM_RULES.instagram.recommendedHook}자 정도만 보여요:{' '}
                  <span className="text-ink">“{(draft.caption ?? '').slice(0, PLATFORM_RULES.instagram.recommendedHook)}”</span>
                </span>
              ) : (
                <span />
              )}
              {platform === 'instagram' ? (
                <CharCount value={draft.caption ?? ''} max={PLATFORM_RULES.instagram.captionMax} />
              ) : (
                <CharCount value={draft.caption ?? ''} recommended={PLATFORM_RULES.facebook.recommendedLength} />
              )}
            </div>
          </div>
        )}

        {platform === 'facebook' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-h3">첨부 사진</span>
              <button
                type="button"
                onClick={() => setPicker('media')}
                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-body-sm hover:bg-surface-hover"
              >
                <Images className="size-3.5" aria-hidden="true" />
                사진 선택 ({draft.mediaImageIds.length}/{PLATFORM_RULES.facebook.mediaMax})
              </button>
            </div>
            {draft.mediaImageIds.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {draft.mediaImageIds.map((id) => (
                  <SmallThumb key={id} id={id} />
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-ink-muted">첨부할 사진이 없어요.</p>
            )}
          </div>
        )}

        <HashtagEditor
          tags={draft.hashtags}
          max={rules.hashtagsMax}
          recommended={platform === 'instagram' ? PLATFORM_RULES.instagram.recommendedHashtags : undefined}
          onChange={(hashtags) => update({ hashtags })}
        />
      </article>

      <aside className="flex flex-col gap-4">
        <PublishPanel kind={platform} content={publishContent} imageIds={publishImageIds} />
        <UnitActions
          unit={platform}
          entity={content}
          beforeRegenerate={flush}
          revert={() => revertPlatform(content.id)}
          stale={
            stale && (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-body-sm text-warning">
                Story가 변경되었어요. 다시 생성하면 최신 Story가 반영됩니다.
              </p>
            )
          }
        />
        <VerificationPanel items={draft.verificationItems} onChange={(verificationItems) => update({ verificationItems })} />
        <CopyPanel options={copy} />
      </aside>

      <ImagePicker
        open={picker === 'cover'}
        onOpenChange={(o) => !o && setPicker(null)}
        title="커버 이미지"
        images={ctx.images}
        selected={draft.coverImageId}
        allowNone
        onSelect={(coverImageId) => update({ coverImageId })}
      />
      <ImagePicker
        open={picker === 'media'}
        onOpenChange={(o) => !o && setPicker(null)}
        title="Facebook 첨부 사진"
        images={ctx.images}
        multi={{ ids: draft.mediaImageIds, max: PLATFORM_RULES.facebook.mediaMax, onChange: (mediaImageIds) => update({ mediaImageIds }) }}
      />
    </>
  )
}
