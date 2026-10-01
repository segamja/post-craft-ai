import type { z } from 'zod'
import { PlatformOut } from '../shared/schemas/ai.js'
import { GeneratePlatformRequest } from '../shared/schemas/api.js'
import { createHandler, MOCK_USAGE, requireModel } from './_lib/handler.js'
import { mockPlatform } from './_lib/mock.js'
import { chatJson } from './_lib/openai.js'
import { imagesBlock, platformSystem, projectBlock, storyBlock } from './_lib/prompts.js'

// [3] Story → Blog / Instagram / Facebook (명세 §10.2, §11). 플랫폼별로 따로 호출해 병렬 실행한다.
export const POST = createHandler(GeneratePlatformRequest, async (input, env) => {
  if (env.mock) return { data: mockPlatform(input), usage: MOCK_USAGE, model: 'mock' }
  const model = requireModel(env.modelText)
  const { data, usage } = await chatJson({
    apiKey: env.openaiApiKey!,
    model,
    name: input.platform,
    system: platformSystem(input.platform),
    user: [projectBlock(input.project), imagesBlock(input.images), storyBlock(input.story)].join('\n\n'),
    // 플랫폼별 스키마가 달라 합집합 타입으로 받는다
    schema: PlatformOut[input.platform] as z.ZodType<z.infer<(typeof PlatformOut)[keyof typeof PlatformOut]>>,
  })
  return { data, usage, model }
})
