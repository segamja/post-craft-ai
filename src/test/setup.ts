import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest globals를 쓰지 않으므로 RTL 자동 정리가 동작하지 않는다 → 직접 정리
afterEach(() => cleanup())

// 전체 테스트를 병렬로 돌리면 IndexedDB(liveQuery) 반영이 1초를 넘길 때가 있다
configure({ asyncUtilTimeout: 3000 })
