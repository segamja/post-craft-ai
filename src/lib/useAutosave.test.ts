import { act, renderHook } from '@testing-library/react'
import { AppError } from '@shared/errorCodes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '@/stores/uiStore'
import { useAutosave } from './useAutosave'

beforeEach(() => {
  vi.useFakeTimers()
  useUiStore.setState({ saveStatus: 'idle', retrySave: null })
})
afterEach(() => vi.useRealTimers())

describe('useAutosave', () => {
  it('입력이 멈추고 1초 뒤 마지막 값만 한 번 저장한다', async () => {
    const save = vi.fn(async () => {})
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })
    rerender({ v: 'ab' })
    await act(() => vi.advanceTimersByTimeAsync(500))
    rerender({ v: 'abc' })
    await act(() => vi.advanceTimersByTimeAsync(999))
    expect(save).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(save).toHaveBeenCalledExactlyOnceWith('abc')
    expect(useUiStore.getState().saveStatus).toBe('saved')
  })

  it('처음 값은 저장하지 않는다', async () => {
    const save = vi.fn(async () => {})
    renderHook(() => useAutosave('a', save))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(save).not.toHaveBeenCalled()
  })

  it('실패하면 지수 백오프로 3회 재시도하고, 그래도 실패하면 error + 재시도 버튼', async () => {
    const save = vi.fn(async () => {
      throw new Error('disk')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 1 } })
    rerender({ v: 2 })
    await act(() => vi.advanceTimersByTimeAsync(1000 + 500 + 1000 + 2000))
    expect(save).toHaveBeenCalledTimes(4)
    expect(useUiStore.getState().saveStatus).toBe('error')
    expect(useUiStore.getState().retrySave).toBeTypeOf('function')
  })

  it('검증 오류는 재시도하지 않는다', async () => {
    const save = vi.fn(async () => {
      throw new AppError('VALIDATION_FAILED')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 1 } })
    rerender({ v: 2 })
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(save).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().saveStatus).toBe('error')
  })

  it('화면을 떠나면 남은 변경을 즉시 저장한다', async () => {
    const save = vi.fn(async () => {})
    const { rerender, unmount } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })
    rerender({ v: 'b' })
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledExactlyOnceWith('b')
  })
})
