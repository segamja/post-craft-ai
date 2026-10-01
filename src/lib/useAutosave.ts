import { isAppError } from '@shared/errorCodes'
import { useCallback, useEffect, useRef } from 'react'
import { useUiStore } from '@/stores/uiStore'

// 자동 저장 (명세 §12.4)
// - 입력이 멈추고 delay(기본 1초) 뒤 저장, 탭 숨김·화면 이탈 시 즉시 저장
// - 실패 시 지수 백오프로 최대 3회 재시도, 그래도 실패하면 편집 내용을 유지한 채 "저장 실패 · 재시도"
// - 저장되지 않은 변경이 있으면 beforeunload 경고

const RETRIES = 3
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface AutosaveOptions {
  delay?: number
  retryBaseMs?: number
}

export function useAutosave<T>(value: T, save: (value: T) => Promise<unknown>, opts: AutosaveOptions = {}) {
  const { delay = 1000, retryBaseMs = 500 } = opts
  const setStatus = useUiStore((s) => s.setSaveStatus)

  const saveRef = useRef(save)
  const latest = useRef(value)
  const savedKey = useRef(JSON.stringify(value))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inflight = useRef<Promise<void> | null>(null)
  const flushRef = useRef<() => Promise<void>>(async () => {})
  const retry = useCallback(() => void flushRef.current(), [])

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current)
    // 진행 중인 저장이 끝난 뒤 최신 값으로 다시 판단
    while (inflight.current) await inflight.current
    const v = latest.current
    const key = JSON.stringify(v)
    if (key === savedKey.current) return

    setStatus('saving')
    inflight.current = (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          await saveRef.current(v)
          savedKey.current = key
          setStatus('saved')
          return
        } catch (e) {
          // 입력 검증 실패는 재시도해도 같으므로 바로 실패 처리
          if (attempt >= RETRIES || isAppError(e, 'VALIDATION_FAILED') || isAppError(e, 'CONFLICT')) {
            console.error('[autosave]', e)
            setStatus('error', retry)
            return
          }
          await sleep(retryBaseMs * 2 ** attempt)
        }
      }
    })().finally(() => {
      inflight.current = null
    })
    await inflight.current
  }, [retryBaseMs, setStatus, retry])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  // 값이 바뀌면 debounce 후 저장
  useEffect(() => {
    latest.current = value
    if (JSON.stringify(value) === savedKey.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), delay)
  }, [value, delay, flush])

  // 탭 숨김·이탈 시 즉시 저장, 미저장 변경 경고
  useEffect(() => {
    const isDirty = () => JSON.stringify(latest.current) !== savedKey.current
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return
      void flush()
      e.preventDefault()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      // 화면을 떠날 때 남은 변경을 저장하고, 성공했으면 헤더 표시를 지운다
      void flush().then(() => {
        if (useUiStore.getState().saveStatus === 'saved') setStatus('idle')
      })
    }
  }, [flush, setStatus])

  const isDirty = useCallback(() => JSON.stringify(latest.current) !== savedKey.current, [])
  const isSaving = useCallback(() => inflight.current !== null, [])
  /** 현재 값을 저장된 것으로 간주 (편집 내용을 버리고 다시 불러오기 직전) */
  const discard = useCallback(() => {
    clearTimeout(timer.current)
    savedKey.current = JSON.stringify(latest.current)
  }, [])

  return { flush, isDirty, isSaving, discard }
}
