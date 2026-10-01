import { ImageAnalysisOut } from '../shared/schemas/ai.js'
import { AnalyzeImageRequest } from '../shared/schemas/api.js'
import { createHandler, MOCK_USAGE, requireModel } from './_lib/handler.js'
import { mockAnalyze } from './_lib/mock.js'
import { chatJson } from './_lib/openai.js'
import { ANALYZE_SYSTEM } from './_lib/prompts.js'

// [1] 사진 1장 분석 (명세 §10.2). 이미지 상세도는 이 단계에서만 사용한다.
export const POST = createHandler(AnalyzeImageRequest, async ({ image }, env) => {
  if (env.mock) return { data: mockAnalyze(), usage: MOCK_USAGE, model: 'mock' }
  const model = requireModel(env.modelVision)
  const url = 'dataUrl' in image ? image.dataUrl : image.url
  const { data, usage } = await chatJson({
    apiKey: env.openaiApiKey!,
    model,
    name: 'image_analysis',
    system: ANALYZE_SYSTEM,
    user: [
      { type: 'text', text: '이 사진을 분석하세요.' },
      { type: 'image_url', image_url: { url, detail: env.imageDetail } },
    ],
    schema: ImageAnalysisOut,
  })
  return { data, usage, model }
})
