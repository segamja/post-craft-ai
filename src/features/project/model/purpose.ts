import type { ContentPurpose, ContentTone } from '@shared/domain'

// UI 라벨 (명세 §6.1)
export const PURPOSES: { value: ContentPurpose; label: string }[] = [
  { value: 'travel', label: '여행' },
  { value: 'daily', label: '일상' },
  { value: 'cafe_restaurant', label: '카페/맛집' },
  { value: 'product', label: '상품 소개' },
  { value: 'new_menu', label: '신메뉴' },
  { value: 'event', label: '행사' },
  { value: 'review', label: '후기' },
  { value: 'other', label: '기타' },
]

export const PURPOSE_LABEL = Object.fromEntries(PURPOSES.map((p) => [p.value, p.label])) as Record<
  ContentPurpose,
  string
>

export const TONE_LABEL: Record<ContentTone, string> = {
  polite: '해요체',
  casual: '반말',
}

export const isContentPurpose = (v: string | null): v is ContentPurpose =>
  PURPOSES.some((p) => p.value === v)
