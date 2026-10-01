import { AppError, ERROR_MESSAGES, type ErrorCode } from '@shared/errorCodes'
import type { z } from 'zod'
import { db } from './db/db'

// /api/* 호출 (Vercel Functions). OpenAI 키는 서버에만 있고, 여기서는 접근 코드만 보낸다.

const ACCESS_CODE_KEY = 'apiAccessCode'
const TIMEOUT_MS = 120_000

export async function getAccessCode(): Promise<string | null> {
  return ((await db.settings.get(ACCESS_CODE_KEY))?.value as string | undefined) ?? null
}

export async function setAccessCode(code: string | null): Promise<void> {
  if (code?.trim()) await db.settings.put({ key: ACCESS_CODE_KEY, value: code.trim() })
  else await db.settings.delete(ACCESS_CODE_KEY)
}

const isErrorCode = (c: unknown): c is ErrorCode => typeof c === 'string' && c in ERROR_MESSAGES

export type ApiCaller = <T>(path: string, body: unknown, schema: z.ZodType<T>) => Promise<T>

export const postApi: ApiCaller = async (path, body, schema) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const code = await getAccessCode()
  if (code) headers['x-app-token'] = code

  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new AppError('AI_TIMEOUT')
    throw new AppError('NETWORK_ERROR')
  }

  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (json as { error?: { code?: unknown; message?: unknown } } | null)?.error
    const errCode = isErrorCode(err?.code) ? err.code : 'AI_UPSTREAM_ERROR'
    throw new AppError(errCode, typeof err?.message === 'string' ? err.message : undefined)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new AppError('AI_SCHEMA_INVALID')
  return parsed.data
}
