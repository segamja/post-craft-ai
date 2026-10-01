import type { ContentProject, UserImage } from '@shared/domain'

export type ProjectDraft = Pick<ContentProject, 'title' | 'purpose' | 'purposeDetail' | 'sourceDescription' | 'tone'>

/**
 * "AI로 콘텐츠 만들기"를 막는 사유 (명세 §13.4).
 * 이미지가 1장 이상이고 모두 ready이며, 기타 목적이면 상세를 입력해야 한다.
 */
export function getGenerateBlockers(draft: ProjectDraft, images: Pick<UserImage, 'status'>[]): string[] {
  const reasons: string[] = []
  if (images.length === 0) reasons.push('사진을 1장 이상 추가해주세요.')
  if (images.some((i) => i.status === 'pending')) reasons.push('사진을 처리하는 중이에요.')
  if (images.some((i) => i.status === 'failed')) reasons.push('업로드에 실패한 사진을 다시 시도하거나 삭제해주세요.')
  if (draft.purpose === 'other' && !draft.purposeDetail?.trim()) reasons.push('기타 목적의 내용을 입력해주세요.')
  return reasons
}
