import type { z } from 'zod'
import { AppError } from '../../shared/errorCodes.js'
import { toStrictJsonSchema } from '../../shared/jsonSchema.js'
import type { UsageT } from '../../shared/schemas/api.js'

// OpenAI Chat Completions + Structured Outputs (명세 §10.3 6~7).
// 응답은 Zod로 다시 검증하고, 실패하면 오류 내용을 알려주며 1회 재시도한다 (§10.6).

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' | 'auto' } }

export interface ChatJsonArgs<T> {
  apiKey: string
  model: string
  name: string
  system: string
  user: string | ContentPart[]
  schema: z.ZodType<T>
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export interface ChatJsonResult<T> {
  data: T
  usage: UsageT
}

interface Completion {
  choices?: { message?: { content?: string | null; refusal?: string | null } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export async function chatJson<T>(args: ChatJsonArgs<T>): Promise<ChatJsonResult<T>> {
  const { apiKey, model, name, system, schema, timeoutMs = 60_000, fetchImpl = fetch } = args
  const jsonSchema = toStrictJsonSchema(schema)
  const messages: { role: string; content: string | ContentPart[] }[] = [
    { role: 'system', content: system },
    { role: 'user', content: args.user },
  ]
  const usage: UsageT = { inputTokens: 0, outputTokens: 0 }

  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response
    try {
      res = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_schema', json_schema: { name, strict: true, schema: jsonSchema } },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError'))
        throw new AppError('AI_TIMEOUT')
      throw new AppError('AI_UPSTREAM_ERROR')
    }
    if (!res.ok) {
      console.error('[openai]', res.status, (await res.text()).slice(0, 500))
      throw new AppError('AI_UPSTREAM_ERROR')
    }

    const body = (await res.json()) as Completion
    usage.inputTokens += body.usage?.prompt_tokens ?? 0
    usage.outputTokens += body.usage?.completion_tokens ?? 0
    const message = body.choices?.[0]?.message
    if (message?.refusal) {
      console.error('[openai] refusal', message.refusal)
      throw new AppError('AI_UPSTREAM_ERROR')
    }

    const content = message?.content ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = undefined
    }
    const result = schema.safeParse(parsed)
    if (result.success) return { data: result.data, usage }

    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    console.warn('[openai] schema invalid', name, issues)
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `응답이 규칙을 어겼습니다. 다음을 고쳐 같은 스키마로 다시 답하세요: ${issues}` },
    )
  }
  throw new AppError('AI_SCHEMA_INVALID')
}
