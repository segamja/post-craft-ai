import { expireStaleJobs } from '@/features/ai/api/aiJobRepo'
import { cleanupStaleUploads } from '@/features/image/api/imageRepo'

/**
 * 명세 §17.7 예약 작업을 대신해 앱 시작 시 한 번 실행한다.
 * 또한 브라우저가 저장 공간 부족 시 데이터를 지우지 않도록 영구 저장을 요청한다.
 */
export async function runStartupMaintenance(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // 지원하지 않는 브라우저는 무시
  }
  try {
    await Promise.all([expireStaleJobs(), cleanupStaleUploads()])
  } catch (e) {
    console.error('[maintenance]', e)
  }
}
