let last = 0

/**
 * 단조 증가하는 ISO 시각. 같은 밀리초에 두 번 저장해도 updatedAt이 달라지게 해서
 * 낙관적 잠금(updatedAt 비교, 명세 §12.5)이 깨지지 않도록 한다.
 */
export function nowIso(): string {
  const t = Math.max(Date.now(), last + 1)
  last = t
  return new Date(t).toISOString()
}

export const newId = (): string => crypto.randomUUID()
