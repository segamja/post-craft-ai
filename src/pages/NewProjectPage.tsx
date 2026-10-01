import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { createProject } from '@/features/project/api/projectRepo'

/** 빈 draft 프로젝트를 만들고 입력 화면으로 이동한다 (명세 §13.2) */
export function NewProjectPage() {
  const navigate = useNavigate()
  // StrictMode의 effect 이중 실행에서 프로젝트가 두 개 생기지 않도록
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void createProject().then((p) => navigate(`/projects/${p.id}`, { replace: true }))
  }, [navigate])

  return <p className="py-24 text-center text-ink-muted">새 콘텐츠를 준비하는 중…</p>
}
