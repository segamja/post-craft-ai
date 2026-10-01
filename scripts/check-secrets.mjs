// 빌드 결과물에 비밀값이 없는지 검사 (명세 §19.1, TC-13). `npm run build` 뒤 실행: npm run check:secrets
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { SECRET_PATTERN } from './secretPattern.js'

const DIST = path.resolve('dist')
const SECRET_KEYS = ['OPENAI_API_KEY', 'UNSPLASH_ACCESS_KEY', 'APP_ACCESS_TOKEN']

// 실제 값: 환경변수 또는 .env.local (있으면)
const values = new Set(SECRET_KEYS.map((k) => process.env[k]).filter(Boolean))
for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  try {
    for (const m of readFileSync(f, 'utf8').matchAll(/^([A-Z_]+)=(.+)$/gm))
      if (SECRET_KEYS.includes(m[1]) && m[2].trim().length >= 8) values.add(m[2].trim())
  } catch {
    // 파일 없음
  }
}

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|css|html|map|json|txt)$/.test(name)) files.push(p)
  }
}
walk(DIST)

const problems = []
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  const m = SECRET_PATTERN.exec(text)
  if (m) problems.push(`${path.relative(DIST, f)}: OpenAI 키 형태 문자열 (${m[0].slice(0, 8)}…)`)
  for (const v of values) if (text.includes(v)) problems.push(`${path.relative(DIST, f)}: 환경변수 비밀값이 포함됨`)
}

if (problems.length) {
  console.error('비밀값 검사 실패:\n' + problems.join('\n'))
  process.exit(1)
}
console.log(`비밀값 검사 통과 (${files.length}개 파일, 실제 값 ${values.size}개 대조)`)
