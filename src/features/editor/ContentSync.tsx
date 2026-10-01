import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { isOwnWrite, type SyncHandle } from './useContentDraft'

export interface SyncProps {
  register: (h: SyncHandle) => void
  onConflict: () => void
}

interface ContentSyncProps<E extends { id: string; updatedAt: string }> {
  entity: E
  children: (sync: SyncProps) => ReactNode
}

/**
 * 편집기를 DB의 최신 상태와 맞춘다.
 * - 외부 변경(AI 재생성, 사진 삭제 RPC, 다른 탭)이 들어오고 편집 중인 내용이 없으면 → 조용히 다시 불러온다
 * - 저장 안 된 편집이 있거나 저장이 CONFLICT로 실패하면 → "다른 창에서 수정되었습니다" 모달 (명세 §12.5)
 */
export function ContentSync<E extends { id: string; updatedAt: string }>({ entity, children }: ContentSyncProps<E>) {
  // ack: 마지막으로 확인한 DB 버전 / mountKey: 편집기를 새로 만든 기준 버전
  const [ack, setAck] = useState(entity.updatedAt)
  const [mountKey, setMountKey] = useState(entity.updatedAt)
  const reload = (u: string) => {
    setAck(u)
    setMountKey(u)
  }
  const [conflict, setConflict] = useState(false)
  // 편집기 핸들: 렌더에는 쓰지 않고, 편집기가 effect에서 등록한다
  const handle = useRef<SyncHandle | null>(null)
  const reloading = useRef(false)

  const register = useCallback(
    (h: SyncHandle) => {
      handle.current = h
    },
    [],
  )
  const onConflict = useCallback(() => setConflict(true), [])

  // 새 DB 버전이 들어오면: 이 탭이 쓴 것이 아니고 저장 중도 아니면 외부 변경으로 본다
  const latest = entity.updatedAt
  useEffect(() => {
    if (latest === ack || isOwnWrite(latest) || conflict) return
    const h = handle.current
    if (!h || h.isSaving()) return
    // 외부 시스템(DB 변경)과의 동기화이므로 effect에서 상태를 바꾼다
    // oxlint-disable-next-line react/set-state-in-effect
    if (h.isDirty()) setConflict(true)
    else {
      setAck(latest)
      setMountKey(latest)
    }
  }, [latest, ack, conflict])

  return (
    <>
      <div key={`${entity.id}:${mountKey}`} className="contents">
        {/* register는 편집기 effect에서만 호출된다 (렌더 중 ref 접근 아님) */}
        {/* oxlint-disable-next-line react/refs */}
        {children({ register, onConflict })}
      </div>
      <ConfirmDialog
        open={conflict}
        onOpenChange={(open) => {
          if (open) return
          if (reloading.current) {
            reloading.current = false
            return
          }
          // 취소 = 내 내용 유지: 최신 버전을 기준으로 다음 저장이 덮어쓴다
          handle.current?.adoptBase(entity.updatedAt)
          setAck(entity.updatedAt)
          setConflict(false)
          void handle.current?.flush()
        }}
        title="다른 창에서 수정되었습니다"
        description="최신 내용을 불러올까요? 불러오면 이 창에서 저장되지 않은 편집은 사라집니다."
        confirmLabel="최신 내용 불러오기"
        cancelLabel="내 내용 유지"
        onConfirm={() => {
          reloading.current = true
          handle.current?.discard()
          setConflict(false)
          reload(entity.updatedAt)
        }}
      />
    </>
  )
}
