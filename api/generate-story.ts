import { StoryOut } from '../shared/schemas/ai.js'
import { GenerateStoryRequest } from '../shared/schemas/api.js'
import { createHandler, MOCK_USAGE, requireModel } from './_lib/handler.js'
import { mockStory } from './_lib/mock.js'
import { chatJson } from './_lib/openai.js'
import { imagesBlock, projectBlock, STORY_SYSTEM } from './_lib/prompts.js'

// [2] 분석 결과 + 설명 + 목적 + 톤 → Story (명세 §10.2)
export const POST = createHandler(GenerateStoryRequest, async (input, env) => {
  if (env.mock) return { data: mockStory(input), usage: MOCK_USAGE, model: 'mock' }
  const model = requireModel(env.modelText)
  const { data, usage } = await chatJson({
    apiKey: env.openaiApiKey!,
    model,
    name: 'story',
    system: STORY_SYSTEM,
    user: [projectBlock(input.project), imagesBlock(input.images)].join('\n\n'),
    schema: StoryOut,
  })
  return { data, usage, model }
})
