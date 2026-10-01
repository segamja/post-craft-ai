import type { z } from 'zod'
import { AppError } from '../../shared/errorCodes.js'
import type { UsageT } from '../../shared/schemas/api.js'
import { readEnv, type ServerEnv } from './env.js'
import { errorResponse, toErrorResponse } from './errors.js'

// Vercel Function 공통 처리 (명세 §10.3를 로컬 DB 구조에 맞게 축소)
// 1. POST만 허용  2. 접근 토큰 확인  3. 본문 Zod 검증  4. 실행  5. { ok, data, usage, model }
// 사용자 인증·소유권·일일 한도·ai_jobs 기록은 단일 사용자 로컬 DB이므로 클라이언트가 담당한다.

const MAX_BODY_BYTES = 4 * 1024 * 1024 // Vercel 요청 본문 한도(4.5MB) 안쪽

export interface HandlerResult<T> {
  data: T
  usage: UsageT
  model: string
}

export function createHandler<Req, Res>(
  requestSchema: z.ZodType<Req>,
  run: (input: Req, env: ServerEnv) => Promise<HandlerResult<Res>>,
) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const env = readEnv()
      if (env.accessToken && request.headers.get('x-app-token') !== env.accessToken)
        return errorResponse('ACCESS_DENIED')

      const length = Number(request.headers.get('content-length') ?? 0)
      if (length > MAX_BODY_BYTES) return errorResponse('VALIDATION_FAILED', '요청이 너무 큽니다.')

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return errorResponse('VALIDATION_FAILED', '잘못된 요청 형식입니다.')
      }
      const parsed = requestSchema.safeParse(body)
      if (!parsed.success) return errorResponse('VALIDATION_FAILED')

      if (!env.mock && !env.openaiApiKey) throw new AppError('AI_NOT_CONFIGURED')
      const result = await run(parsed.data, env)
      return Response.json({ ok: true, ...result })
    } catch (e) {
      return toErrorResponse(e)
    }
  }
}

export const MOCK_USAGE: UsageT = { inputTokens: 0, outputTokens: 0 }

export function requireModel(model: string | null): string {
  if (!model) throw new AppError('AI_NOT_CONFIGURED', 'OPENAI_MODEL_* 환경변수를 설정해주세요.')
  return model
}
