import { Database, FileText, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { revokeConsent, useConsent } from '@/features/consent/api/consentRepo'
import { Section } from '@/features/result/Inspector'
import { getAccessCode, setAccessCode } from '@/lib/apiClient'
import { db } from '@/lib/db/db'
import { toast } from '@/stores/uiStore'

const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : n < 1024 ** 3 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`

const formatDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })

function AccessCodeSection() {
  const [code, setCode] = useState('')
  useEffect(() => {
    void getAccessCode().then((c) => setCode(c ?? ''))
  }, [])
  return (
    <Section title="AI 접근 코드" aside={<KeyRound className="size-4 text-primary" aria-hidden="true" />}>
      <p className="text-ink-secondary">
        배포된 서비스에서 AI 기능을 쓰려면 운영자가 정한 접근 코드가 필요할 수 있어요. 코드는 이 브라우저에만 저장됩니다.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          await setAccessCode(code)
          toast(code.trim() ? '접근 코드를 저장했어요.' : '접근 코드를 지웠어요.')
        }}
      >
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="AI 접근 코드"
          autoComplete="off"
          className="min-w-60 flex-1 rounded-lg border bg-surface px-3 py-2 focus:border-border-focus focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover">
          저장
        </button>
      </form>
    </Section>
  )
}

function ConsentSection() {
  const consent = useConsent()
  const [confirm, setConfirm] = useState(false)
  return (
    <Section title="AI 처리 동의" aside={<ShieldCheck className="size-4 text-primary" aria-hidden="true" />}>
      {consent ? (
        <p className="text-ink-secondary">
          {formatDate(consent.consentedAt)}에 동의했습니다. (고지 버전 {consent.version})
        </p>
      ) : (
        <p className="text-ink-secondary">동의 기록이 없습니다.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link to="/privacy" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-body-sm hover:bg-surface-hover">
          <FileText className="size-3.5" aria-hidden="true" />
          개인정보처리방침
        </Link>
        <Link to="/terms" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-body-sm hover:bg-surface-hover">
          <FileText className="size-3.5" aria-hidden="true" />
          이용약관
        </Link>
        <button type="button" onClick={() => setConfirm(true)} className="rounded-lg px-3 py-1.5 text-body-sm text-danger hover:bg-danger-bg">
          동의 철회
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="AI 처리 동의를 철회할까요?"
        description="동의를 철회하면 다시 동의할 때까지 앱을 사용할 수 없습니다. 저장된 데이터는 지워지지 않습니다."
        confirmLabel="철회"
        destructive
        onConfirm={() => void revokeConsent()}
      />
    </Section>
  )
}

function StorageSection() {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    void (async () => {
      const e = await navigator.storage?.estimate?.()
      const persisted = (await navigator.storage?.persisted?.()) ?? false
      if (e) setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0, persisted })
    })()
  }, [])

  return (
    <Section title="데이터 관리" aside={<Database className="size-4 text-primary" aria-hidden="true" />}>
      <p className="text-ink-secondary">모든 프로젝트와 사진은 서버가 아닌 이 브라우저(IndexedDB)에 저장됩니다.</p>
      {estimate && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-body-sm">
            <span>사용 중 {formatBytes(estimate.usage)}</span>
            <span className="text-ink-muted">사용 가능 {formatBytes(estimate.quota)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (estimate.usage / Math.max(1, estimate.quota)) * 100)}%` }} />
          </div>
          <p className="text-body-sm text-ink-secondary">
            {estimate.persisted
              ? '영구 저장이 허용되어 브라우저가 임의로 데이터를 지우지 않습니다.'
              : '영구 저장이 허용되지 않았어요. 저장 공간이 부족하면 브라우저가 데이터를 지울 수 있습니다.'}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-danger px-3 py-2 font-semibold text-danger hover:bg-danger-bg"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        전체 데이터 삭제
      </button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="모든 데이터를 삭제할까요?"
        description="모든 프로젝트, 사진, 생성 결과, 동의 기록이 이 브라우저에서 영구히 삭제되며 되돌릴 수 없습니다."
        confirmLabel="전체 삭제"
        destructive
        onConfirm={async () => {
          await db.delete()
          await db.open()
          toast('모든 데이터를 삭제했어요.')
          navigate('/', { replace: true })
        }}
      />
    </Section>
  )
}

export function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" />
      <div className="flex max-w-2xl flex-col gap-5">
        <ConsentSection />
        <AccessCodeSection />
        <StorageSection />
      </div>
    </>
  )
}
