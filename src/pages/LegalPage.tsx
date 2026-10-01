import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Logo } from '@/components/common/Logo'

// 개인정보처리방침 / 이용약관 (명세 §19.3). 초안이며, 국외 이전 고지 등 법적 요건은 출시 전 전문가 검토 (Q-07).

function Doc({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <Logo />
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          돌아가기
        </button>
      </div>
      <article className="flex flex-col gap-4 rounded-2xl border bg-surface p-8 shadow-e1 [&_h2]:mt-4 [&_h2]:text-h2 [&_li]:ml-5 [&_li]:list-disc [&_p]:text-ink-secondary">
        <h1 className="text-h1">{title}</h1>
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-body-sm text-warning">초안입니다. 정식 출시 전 법무 검토를 거쳐 확정됩니다.</p>
        {children}
      </article>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <Doc title="개인정보처리방침">
      <h2>1. 처리하는 정보</h2>
      <ul>
        <li>사용자가 올린 사진과 입력한 설명, 콘텐츠 목적·어조</li>
        <li>AI가 만든 사진 분석 결과와 생성 콘텐츠, 편집 내용</li>
      </ul>
      <h2>2. 저장 위치</h2>
      <p>위 정보는 서비스 서버가 아니라 사용자의 브라우저(IndexedDB)에만 저장됩니다. 서비스 운영자는 이 정보를 보관하지 않습니다.</p>
      <h2>3. 국외 이전 (AI 처리)</h2>
      <p>
        “AI로 콘텐츠 만들기” 또는 “다시 생성”을 누를 때, 사진(축소본)·설명·분석 결과가 콘텐츠 생성을 위해 OpenAI(미국)로 전송됩니다. 전송은 요청
        시점에만 이루어지며, OpenAI의 데이터 보관·이용 정책이 적용됩니다.
      </p>
      <h2>4. 위치정보 등 촬영 정보</h2>
      <p>사진은 업로드할 때 다시 인코딩되어 GPS를 포함한 모든 촬영 정보(EXIF)가 제거됩니다.</p>
      <h2>5. 인물 정보</h2>
      <p>AI에게 사진 속 사람이 누구인지 식별하거나 나이·인종·건강 등 민감한 속성을 추정하지 않도록 지시합니다.</p>
      <h2>6. 삭제</h2>
      <p>설정 &gt; 데이터 관리 &gt; 전체 데이터 삭제로 언제든 모든 정보를 지울 수 있습니다. 브라우저의 사이트 데이터를 지워도 삭제됩니다.</p>
      <h2>7. Unsplash</h2>
      <p>Unsplash 검색어는 사진 검색을 위해 Unsplash로 전송됩니다.</p>
    </Doc>
  )
}

export function TermsPage() {
  return (
    <Doc title="이용약관">
      <h2>1. 서비스</h2>
      <p>PostCraft AI는 사진과 설명을 바탕으로 SNS 콘텐츠 초안을 만들고 편집하도록 돕는 도구입니다.</p>
      <h2>2. AI 생성물</h2>
      <p>
        AI가 만든 결과는 초안입니다. 사실 여부(장소, 가격, 일정 등)는 게시 전에 사용자가 직접 확인해야 하며, “확인 필요 정보”로 표시된 항목은 특히
        검토가 필요합니다.
      </p>
      <h2>3. 사진과 권리</h2>
      <p>사용자는 올린 사진에 대한 권리를 가지고 있어야 합니다. Unsplash 사진은 Unsplash 라이선스와 출처 표기 규칙을 따릅니다.</p>
      <h2>4. 데이터 보관 책임</h2>
      <p>데이터는 사용자의 브라우저에만 저장되므로, 브라우저 데이터 삭제나 기기 변경으로 사라진 데이터는 복구할 수 없습니다.</p>
      <h2>5. 이용 제한</h2>
      <p>과도한 AI 호출을 막기 위해 하루 생성 횟수가 제한될 수 있습니다.</p>
    </Doc>
  )
}
