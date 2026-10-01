import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-h1">찾을 수 없는 페이지예요</h1>
      <p className="text-ink-secondary">주소가 바뀌었거나 접근 권한이 없습니다.</p>
      <Link to="/" className="font-semibold text-primary hover:underline">
        홈으로
      </Link>
    </div>
  )
}
