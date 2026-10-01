// 서버 전용 환경변수. 클라이언트 번들에 들어가지 않는다 (VITE_ 접두사 없음).

export interface ServerEnv {
  openaiApiKey: string | null
  modelVision: string | null
  modelText: string | null
  accessToken: string | null
  /** 사진 분석 상세도. high/auto는 정확하지만 이미지당 입력 토큰이 크게 늘어난다 (명세 Q-05) */
  imageDetail: 'low' | 'high' | 'auto'
  unsplashAccessKey: string | null
  /** 키가 없고 운영 환경이 아니면 Mock 응답 (명세 §24.3 OpenAI Mock) */
  mock: boolean
}

const val = (k: string) => {
  const v = process.env[k]?.trim()
  return v ? v : null
}

export function readEnv(): ServerEnv {
  const openaiApiKey = val('OPENAI_API_KEY')
  const forced = val('AI_MOCK')
  const isProd = process.env.VERCEL_ENV === 'production'
  return {
    openaiApiKey,
    modelVision: val('OPENAI_MODEL_VISION'),
    modelText: val('OPENAI_MODEL_TEXT'),
    accessToken: val('APP_ACCESS_TOKEN'),
    imageDetail: (['low', 'high', 'auto'] as const).find((d) => d === val('OPENAI_IMAGE_DETAIL')) ?? 'auto',
    unsplashAccessKey: val('UNSPLASH_ACCESS_KEY'),
    mock: forced ? forced === '1' : !openaiApiKey && !isProd,
  }
}
