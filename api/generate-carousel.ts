import { CarouselOut } from '../shared/schemas/ai.js'
import { GenerateCarouselRequest } from '../shared/schemas/api.js'
import { createHandler, MOCK_USAGE, requireModel } from './_lib/handler.js'
import { mockCarousel } from './_lib/mock.js'
import { chatJson } from './_lib/openai.js'
import { CAROUSEL_SYSTEM, imagesBlock, projectBlock, storyBlock } from './_lib/prompts.js'

// [4] Instagram 결과 기반 Carousel (명세 §10.2, §11)
export const POST = createHandler(GenerateCarouselRequest, async (input, env) => {
  if (env.mock) return { data: mockCarousel(input), usage: MOCK_USAGE, model: 'mock' }
  const model = requireModel(env.modelText)
  const instagram = [
    '[Instagram 캡션]',
    input.instagram.caption,
    `해시태그: ${input.instagram.hashtags.join(' ')}`,
  ].join('\n')
  const { data, usage } = await chatJson({
    apiKey: env.openaiApiKey!,
    model,
    name: 'carousel',
    system: CAROUSEL_SYSTEM,
    user: [
      projectBlock(input.project),
      imagesBlock(input.images),
      storyBlock(input.story),
      instagram,
      `[요청 장수] ${input.slideCount}장`,
    ].join('\n\n'),
    schema: CarouselOut,
  })
  // 요청 장수보다 많이 오면 자른다
  return { data: { slides: data.slides.slice(0, input.slideCount) }, usage, model }
})
