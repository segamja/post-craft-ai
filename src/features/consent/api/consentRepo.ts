import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/db'
import { nowIso } from '@/lib/db/time'

/** 고지 내용이 바뀌면 올린다 → 기존 동의는 무효가 되고 다시 묻는다 */
export const CONSENT_VERSION = '2026-10-01'

export interface ConsentRecord {
  version: string
  consentedAt: string
}

const KEY = 'aiConsent'

export async function getConsent(): Promise<ConsentRecord | null> {
  const row = await db.settings.get(KEY)
  return (row?.value as ConsentRecord | undefined) ?? null
}

export async function giveConsent(): Promise<ConsentRecord> {
  const value: ConsentRecord = { version: CONSENT_VERSION, consentedAt: nowIso() }
  await db.settings.put({ key: KEY, value })
  return value
}

export async function revokeConsent(): Promise<void> {
  await db.settings.delete(KEY)
}

export const isConsentValid = (c: ConsentRecord | null) => c?.version === CONSENT_VERSION

/** undefined = 조회 중, null = 동의 없음 */
export function useConsent(): ConsentRecord | null | undefined {
  return useLiveQuery(getConsent)
}
