import { ArrowRight } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { startGeneration } from '@/features/ai/startGeneration'
import { useImages } from '@/features/image/api/imageQueries'
import { useProject } from '@/features/project/api/projectQueries'
import { ProjectInputForm } from '@/features/project/components/ProjectInputForm'
import { NotFoundPage } from './NotFoundPage'

export function ProjectInputPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const images = useImages(id)

  if (project === undefined || images === undefined) return null
  if (project === null) return <NotFoundPage />

  return (
    <>
      <PageHeader
        title="새 콘텐츠 만들기"
        description="사진과 간단한 설명을 넣으면 AI가 Story를 만들고 플랫폼별 콘텐츠로 바꿔드립니다."
        actions={
          project.status === 'generated' && (
            <Link
              to={`/projects/${project.id}/result`}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              생성 결과 보기
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )
        }
      />
      <ProjectInputForm
        key={project.id}
        project={project}
        images={images}
        onGenerate={() => {
          // 생성은 화면 이동과 무관하게 계속 진행되고, 결과 화면에서 단계별로 채워진다
          void startGeneration(project.id)
          navigate(`/projects/${project.id}/result`)
        }}
      />
    </>
  )
}
