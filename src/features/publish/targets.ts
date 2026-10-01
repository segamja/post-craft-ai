import { db } from '@/lib/db/db'

// SNS 글쓰기 화면 바로 열기 (명세 Phase 2의 "직접 게시" 전 단계).
// 각 서비스는 웹에서 본문을 미리 채워 여는 공식 방법이 없으므로, 내용을 클립보드에 복사한 뒤 글쓰기 화면을 연다.

export type PublishTargetId = 'naver' | 'tistory' | 'instagram' | 'facebook'

export interface PublishTarget {
  id: PublishTargetId
  label: string
  /** 새 창으로 열 주소 (티스토리는 블로그 주소가 필요) */
  url: (opts: { tistoryBlog?: string | null }) => string | null
  /** 붙여넣기 안내 */
  hint: string
}

export const TARGETS: Record<PublishTargetId, PublishTarget> = {
  naver: {
    id: 'naver',
    label: '네이버 블로그',
    url: () => 'https://blog.naver.com/GoBlogWrite.naver',
    hint: '제목 칸에 제목을, 본문에 Ctrl+V로 붙여넣으세요. 표시된 자리에 내려받은 사진을 넣으면 됩니다.',
  },
  tistory: {
    id: 'tistory',
    label: '티스토리',
    url: ({ tistoryBlog }) => (tistoryBlog ? `https://${tistoryBlog}.tistory.com/manage/newpost/` : null),
    hint: '제목 칸에 제목을, 본문에 Ctrl+V로 붙여넣으세요. 표시된 자리에 내려받은 사진을 넣으면 됩니다.',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    url: () => 'https://www.instagram.com/',
    hint: '“만들기(+)”에서 내려받은 사진을 순서대로 고른 뒤, 캡션 칸에 Ctrl+V로 붙여넣으세요.',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    url: () => 'https://www.facebook.com/',
    hint: '“무슨 생각을 하고 계신가요?”를 눌러 Ctrl+V로 붙여넣고, 내려받은 사진을 추가하세요.',
  },
}

/** 티스토리 블로그 주소: "myblog", "myblog.tistory.com", "https://myblog.tistory.com/" 모두 허용 */
export function normalizeTistoryBlog(input: string): string | null {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\.tistory\.com.*$/, '')
    .replace(/\/.*$/, '')
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(name) ? name : null
}

const TISTORY_KEY = 'tistoryBlog'

export async function getTistoryBlog(): Promise<string | null> {
  return ((await db.settings.get(TISTORY_KEY))?.value as string | undefined) ?? null
}

export async function setTistoryBlog(name: string | null): Promise<void> {
  if (name) await db.settings.put({ key: TISTORY_KEY, value: name })
  else await db.settings.delete(TISTORY_KEY)
}
