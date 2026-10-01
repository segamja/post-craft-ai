import type { UUID } from '@shared/domain'
import type { ErrorCode } from '@shared/errorCodes'
import { create } from 'zustand'

// UI 상태 전용. 영속 데이터는 로컬 DB(useLiveQuery)에서 읽는다 (명세 §12.1).
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
}

interface UiState {
  saveStatus: SaveStatus
  /** 저장 실패 시 헤더의 "재시도"가 호출 */
  retrySave: (() => void) | null
  setSaveStatus: (status: SaveStatus, retry?: (() => void) | null) => void

  toasts: Toast[]
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void

  /** 업로드 재시도용 원본 File, 실패 사유 (새로고침하면 사라짐) */
  uploadFiles: Record<UUID, File>
  uploadErrors: Record<UUID, ErrorCode>
  setUploadFile: (id: UUID, file: File) => void
  setUploadError: (id: UUID, code: ErrorCode | null) => void
  forgetUpload: (id: UUID) => void

  /** 교체 처리 중인 기존 이미지 id */
  replacing: Record<UUID, true>
  setReplacing: (id: UUID, on: boolean) => void
}

let toastSeq = 0

export const useUiStore = create<UiState>()((set) => ({
  saveStatus: 'idle',
  retrySave: null,
  setSaveStatus: (saveStatus, retry = null) => set({ saveStatus, retrySave: retry }),

  toasts: [],
  pushToast: (message, tone = 'info') => set((s) => ({ toasts: [...s.toasts, { id: ++toastSeq, message, tone }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  uploadFiles: {},
  uploadErrors: {},
  setUploadFile: (id, file) => set((s) => ({ uploadFiles: { ...s.uploadFiles, [id]: file } })),
  setUploadError: (id, code) =>
    set((s) => {
      const uploadErrors = { ...s.uploadErrors }
      if (code) uploadErrors[id] = code
      else delete uploadErrors[id]
      return { uploadErrors }
    }),
  forgetUpload: (id) =>
    set((s) => {
      const { [id]: _f, ...uploadFiles } = s.uploadFiles
      const { [id]: _e, ...uploadErrors } = s.uploadErrors
      return { uploadFiles, uploadErrors }
    }),

  replacing: {},
  setReplacing: (id, on) =>
    set((s) => {
      const replacing = { ...s.replacing }
      if (on) replacing[id] = true
      else delete replacing[id]
      return { replacing }
    }),
}))

export const toast = (message: string, tone?: Toast['tone']) => useUiStore.getState().pushToast(message, tone)
