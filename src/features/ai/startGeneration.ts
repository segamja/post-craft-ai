import type { UUID } from '@shared/domain'
import { ERROR_MESSAGES } from '@shared/errorCodes'
import { toast } from '@/stores/uiStore'
import { runPipeline, type PipelineDeps } from './pipeline'

/** UI 진입점: 파이프라인을 실행하고 결과를 알림으로 알린다. 화면을 옮겨도 계속 진행된다. */
export async function startGeneration(projectId: UUID, deps?: PipelineDeps) {
  const result = await runPipeline(projectId, deps)
  if (result.ok) {
    toast('콘텐츠 생성이 완료되었어요.')
  } else {
    const first = result.failures[0]
    if (first) toast(ERROR_MESSAGES[first.code], 'error')
  }
  return result
}
