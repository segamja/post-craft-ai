// 오류 코드 (명세 §21.1). 로컬 DB 전환으로 AUTH_REQUIRED / CONSENT_REQUIRED / FORBIDDEN 은 사용하지 않는다.
export const ERROR_MESSAGES = {
  NOT_FOUND: '찾을 수 없는 항목입니다.',
  VALIDATION_FAILED: '입력값을 확인해주세요.',
  IMAGE_LIMIT_EXCEEDED: '사진은 프로젝트당 최대 10장까지 추가할 수 있어요.',
  IMAGE_SET_MISMATCH: '사진 목록이 바뀌었습니다. 다시 시도해주세요.',
  INVALID_REPLACEMENT: '교체할 사진이 준비되지 않았습니다.',
  UNSUPPORTED_FILE: '지원하지 않는 파일 형식입니다.',
  FILE_TOO_LARGE: '파일이 너무 큽니다. (최대 20MB)',
  INVALID_IMAGE_REF: '존재하지 않는 사진을 참조하고 있습니다.',
  CAROUSEL_INSTAGRAM_ONLY: 'Carousel은 Instagram 콘텐츠에만 만들 수 있어요.',
  CONFLICT: '다른 창에서 수정되었습니다. 최신 내용을 불러올까요?',
  RATE_LIMITED: '오늘 AI 생성 한도를 모두 사용했습니다.',
  JOB_IN_PROGRESS: '이미 생성 중입니다.',
  AI_UPSTREAM_ERROR: 'AI 응답에 문제가 있었습니다. 다시 시도해주세요.',
  AI_TIMEOUT: 'AI 응답이 지연되고 있습니다. 다시 시도해주세요.',
  AI_SCHEMA_INVALID: 'AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  JOB_INTERRUPTED: '창이 닫혀 생성이 중단되었습니다. 다시 시도해주세요.',
  ACCESS_DENIED: '접근 코드가 필요합니다. 설정에서 접근 코드를 입력해주세요.',
  AI_NOT_CONFIGURED: 'AI 서버 설정이 완료되지 않았습니다.',
  UNSPLASH_NOT_CONFIGURED: 'Unsplash 검색이 설정되지 않았습니다.',
  UNSPLASH_ERROR: 'Unsplash에서 사진을 불러오지 못했습니다.',
  STORAGE_QUOTA_EXCEEDED: '브라우저 저장 공간이 부족합니다. 사용하지 않는 프로젝트를 삭제해주세요.',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

export class AppError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code])
    this.name = 'AppError'
    this.code = code
  }
}

export const isAppError = (e: unknown, code?: ErrorCode): e is AppError =>
  e instanceof AppError && (code === undefined || e.code === code)
