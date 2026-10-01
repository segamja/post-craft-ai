import type { UserImage } from '@shared/domain'
import { UNSPLASH_HOME, withUtm } from '@/features/result/exportFormats'
import { cn } from '@/lib/utils'

/** "Photo by {작가} on Unsplash" (명세 §8.6, Unsplash API 가이드라인: 작가·Unsplash 링크 + UTM) */
export function UnsplashCredit({ image, className }: { image: Pick<UserImage, 'unsplash'>; className?: string }) {
  const u = image.unsplash
  if (!u) return null
  return (
    <span className={cn('text-ink-secondary', className)}>
      Photo by{' '}
      <a href={withUtm(u.photographerUrl)} target="_blank" rel="noreferrer" className="underline hover:text-ink">
        {u.photographerName}
      </a>{' '}
      on{' '}
      <a href={UNSPLASH_HOME} target="_blank" rel="noreferrer" className="underline hover:text-ink">
        Unsplash
      </a>
    </span>
  )
}
