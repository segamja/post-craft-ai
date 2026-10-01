import { isAppError } from '@shared/errorCodes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutosave } from '@/lib/useAutosave'

// 편집 버퍼 + 자동 저장 + 낙관적 잠금 (명세 §12.4, §12.5)
// - 화면은 로컬 draft를 편집하고, 1초 debounce로 save(draft, lastKnownUpdatedAt)를 호출한다.
// - 이 탭이 쓴 updatedAt은 ownWrites에 기록해 "외부 변경"과 구분한다 (ContentSync 참고).

const ownWrites = new Set<string>()
export const isOwnWrite = (updatedAt: string) => ownWrites.has(updatedAt)

export interface SyncHandle {
  isDirty: () => boolean
  isSaving: () => boolean
  /** 충돌 시 "내 내용 유지": 최신 updatedAt을 기준으로 삼아 다음 저장이 덮어쓰게 한다 */
  adoptBase: (updatedAt: string) => void
  flush: () => Promise<void>
  /** 저장하지 않고 버린다 (최신 내용 불러오기) */
  discard: () => void
}

export interface ContentDraftOptions<E extends { updatedAt: string }, D> {
  entity: E
  toDraft: (e: E) => D
  save: (draft: D, lastKnownUpdatedAt: string) => Promise<{ updatedAt: string }>
  onConflict: () => void
  /** ContentSync가 넘겨주는 핸들 등록 */
  register?: (h: SyncHandle) => void
}

export function useContentDraft<E extends { updatedAt: string }, D>({
  entity,
  toDraft,
  save,
  onConflict,
  register,
}: ContentDraftOptions<E, D>) {
  const [draft, setDraft] = useState(() => toDraft(entity))
  const lastKnown = useRef(entity.updatedAt)
  const saveRef = useRef(save)
  const conflictRef = useRef(onConflict)
  useEffect(() => {
    saveRef.current = save
    conflictRef.current = onConflict
  }, [save, onConflict])

  const doSave = useCallback(async (d: D) => {
    try {
      const res = await saveRef.current(d, lastKnown.current)
      ownWrites.add(res.updatedAt)
      lastKnown.current = res.updatedAt
    } catch (e) {
      if (isAppError(e, 'CONFLICT')) conflictRef.current()
      throw e
    }
  }, [])

  const { flush, isDirty, isSaving, discard } = useAutosave(draft, doSave)

  useEffect(() => {
    register?.({
      isDirty,
      isSaving,
      flush,
      discard,
      adoptBase: (u) => {
        lastKnown.current = u
      },
    })
  }, [register, isDirty, isSaving, flush, discard])

  const update = useCallback((patch: Partial<D> | ((d: D) => D)) => {
    setDraft((d) => (typeof patch === 'function' ? patch(d) : { ...d, ...patch }))
  }, [])

  return { draft, update, flush }
}
