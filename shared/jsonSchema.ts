import { z } from 'zod'

// Zod → OpenAI Structured Outputs(strict) 용 JSON Schema.
// strict 모드 규칙: 모든 object에 additionalProperties:false, 모든 속성 required.
// 길이·개수 제약 키워드는 지원 범위가 모델마다 달라 제거하고, 응답을 Zod로 다시 검증한다.

type Json = Record<string, unknown>

const DROP = new Set([
  '$schema',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'pattern',
  'format',
])

function strictify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictify)
  if (!node || typeof node !== 'object') return node
  const src = node as Json
  const out: Json = {}
  for (const [k, v] of Object.entries(src)) {
    if (DROP.has(k)) continue
    if (k === 'oneOf') out.anyOf = strictify(v)
    else if (k === 'const') out.enum = [v]
    else out[k] = strictify(v)
  }
  if (out.type === 'object' && out.properties && typeof out.properties === 'object') {
    out.additionalProperties = false
    out.required = Object.keys(out.properties as Json)
  }
  return out
}

export function toStrictJsonSchema(schema: z.ZodType): Json {
  return strictify(z.toJSONSchema(schema, { target: 'draft-7', io: 'output' })) as Json
}
