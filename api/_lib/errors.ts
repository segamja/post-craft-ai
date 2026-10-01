import { AppError, ERROR_MESSAGES, type ErrorCode } from '../../shared/errorCodes.js'

const STATUS: Partial<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  ACCESS_DENIED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_UPSTREAM_ERROR: 502,
  AI_SCHEMA_INVALID: 502,
  AI_NOT_CONFIGURED: 503,
  UNSPLASH_NOT_CONFIGURED: 503,
  UNSPLASH_ERROR: 502,
}

export function errorResponse(code: ErrorCode, message: string = ERROR_MESSAGES[code]): Response {
  return Response.json({ ok: false, error: { code, message } }, { status: STATUS[code] ?? 500 })
}

export function toErrorResponse(e: unknown): Response {
  if (e instanceof AppError) return errorResponse(e.code, e.message)
  console.error('[api] unexpected', e)
  return errorResponse('AI_UPSTREAM_ERROR')
}
