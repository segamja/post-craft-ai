import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { isConsentValid, useConsent } from '../api/consentRepo'

/** CONSENT_REQUIRED: 동의 전에는 앱을 쓰지 않고 동의 화면으로 보낸다 (돌아올 경로 보존) */
export function RequireConsent({ children }: { children: ReactNode }) {
  const consent = useConsent()
  const location = useLocation()

  if (consent === undefined) return null
  if (!isConsentValid(consent)) {
    const next = location.pathname + location.search
    return <Navigate to={`/onboarding/consent?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
