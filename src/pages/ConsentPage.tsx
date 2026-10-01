import { HardDrive, ImageUp, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { giveConsent } from '@/features/consent/api/consentRepo'

const NOTICES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ImageUp,
    title: '사진과 설명이 OpenAI(해외)로 전송됩니다',
    body: '“AI로 콘텐츠 만들기”를 누르면 사진 분석을 위해 사진을 OpenAI로 보냅니다. 이후 글 생성에는 사진 대신 분석 결과와 입력하신 설명만 보냅니다.',
  },
  {
    icon: ShieldCheck,
    title: '전송 전에 위치정보를 지우고, 인물을 식별하지 않습니다',
    body: '사진은 업로드할 때 크기를 줄이면서 GPS 등 촬영 정보를 모두 제거합니다. AI에게는 사진 속 사람이 누구인지, 나이·인종 같은 속성을 추정하지 않도록 지시합니다.',
  },
  {
    icon: HardDrive,
    title: '작업한 내용은 이 브라우저에만 저장됩니다',
    body: '프로젝트, 사진, 생성 결과는 서버가 아닌 이 브라우저에 저장됩니다. 다른 기기와 동기화되지 않으며, 브라우저의 사이트 데이터를 지우면 함께 삭제됩니다.',
  },
]

// Q-07: 국외 이전 고지 문구와 OpenAI 보관 정책은 출시 전 법무 검토 후 확정
export function ConsentPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)

  const next = params.get('next')
  const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/'

  async function handleSubmit() {
    setSaving(true)
    await giveConsent()
    navigate(target, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Logo className="mb-6" />
        <div className="rounded-2xl border bg-surface p-8 shadow-e1">
          <h1 className="text-h1">시작하기 전에 확인해주세요</h1>
          <p className="mt-1 text-ink-secondary">PostCraft AI가 사진과 설명을 처리하는 방식입니다.</p>

          <ul className="mt-6 flex flex-col gap-5">
            {NOTICES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-h3">{title}</p>
                  <p className="mt-0.5 text-ink-secondary">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-4">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>위 내용을 확인했으며, AI 처리를 위한 사진·설명의 국외 전송에 동의합니다.</span>
          </label>

          <button
            type="button"
            disabled={!agreed || saving}
            onClick={handleSubmit}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            동의하고 시작하기
          </button>
          <p className="mt-4 text-center text-body-sm text-ink-secondary">
            자세한 내용은{' '}
            <Link to="/privacy" className="underline">개인정보처리방침</Link>과{' '}
            <Link to="/terms" className="underline">이용약관</Link>을 확인하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
