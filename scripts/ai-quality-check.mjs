// AI 품질 점검 (명세 §24.4, 릴리스 전 수동 점검 보조)
// 목적별 샘플 8종 × N회 Story를 생성하고, 입력에 없는 구체 정보(가격·시간·날짜·숫자)가
// verificationItems 없이 본문에 들어갔는지 자동으로 표시한다. 최종 판단은 사람이 결과 파일을 읽고 한다.
//
// 사용: 개발 서버(npm run dev, 실제 키) 실행 후
//   node scripts/ai-quality-check.mjs [--rounds 3] [--base http://localhost:5173] [--out docs/AI_품질점검_결과.md]

import { writeFileSync } from 'node:fs'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : def
}
const ROUNDS = Number(arg('rounds', '3'))
const BASE = arg('base', 'http://localhost:5173')
const OUT = arg('out', 'docs/AI_품질점검_결과.md')

const img = (alias, position, description, tags = [], detectedText = null) => ({ alias, position, description, tags, detectedText })

const SAMPLES = [
  {
    purpose: 'travel',
    sourceDescription: '친구랑 제주 애월에 다녀왔어요. 해변 카페에서 노을을 봤어요.',
    images: [img('IMG1', 0, '해질녘 바다와 현무암 해안, 하늘이 주황빛'), img('IMG2', 1, '창가 자리의 라떼 두 잔, 창밖으로 바다')],
  },
  {
    purpose: 'daily',
    sourceDescription: '퇴근하고 동네 공원 산책',
    images: [img('IMG1', 0, '나무가 늘어선 공원 산책로, 저녁 빛'), img('IMG2', 1, '벤치 위에 놓인 캔커피')],
  },
  {
    purpose: 'cafe_restaurant',
    sourceDescription: '성수동 새로 생긴 베이커리. 크루아상이 정말 바삭했어요.',
    images: [
      img('IMG1', 0, '나무 테이블 위 크루아상과 라떼', ['크루아상'], null),
      img('IMG2', 1, '가게 외관, 간판이 보임', ['간판'], 'BREAD LAB'),
    ],
  },
  {
    purpose: 'product',
    sourceDescription: '새로 산 텀블러 소개. 색이 마음에 들어요.',
    images: [img('IMG1', 0, '세이지 그린 색 스테인리스 텀블러, 빨대 포함')],
  },
  {
    purpose: 'new_menu',
    sourceDescription: '우리 가게 여름 신메뉴 출시',
    images: [img('IMG1', 0, '유리잔에 담긴 복숭아 에이드, 얼음과 민트'), img('IMG2', 1, '메뉴판 일부', [], '복숭아 에이드 6,500')],
  },
  {
    purpose: 'event',
    sourceDescription: '동네 플리마켓에 셀러로 참여했어요',
    images: [img('IMG1', 0, '야외 천막 아래 수공예 액세서리 진열대'), img('IMG2', 1, '사람들이 오가는 장터 전경')],
  },
  {
    purpose: 'review',
    sourceDescription: '무선 이어폰 한 달 사용 후기. 노이즈 캔슬링이 좋아요.',
    images: [img('IMG1', 0, '흰색 무선 이어폰과 충전 케이스')],
  },
  {
    purpose: 'other',
    purposeDetail: '반려견 일기',
    sourceDescription: '우리 강아지 첫 바다',
    images: [img('IMG1', 0, '모래사장 위를 뛰는 갈색 소형견'), img('IMG2', 1, '젖은 털로 웃는 듯한 강아지 얼굴')],
  },
]

// 입력에 없는데 나오면 의심할 구체 정보
const SUSPICIOUS = [
  /\d{1,3}(,\d{3})*\s*원/g,
  /\d{1,2}\s*시(\s*\d{1,2}\s*분)?/g,
  /(오전|오후)\s*\d{1,2}/g,
  /\d{1,2}\s*월\s*\d{1,2}\s*일/g,
  /\d{4}\s*년/g,
  /영업\s*시간/g,
  /\d+\s*(분|km|m|층|번\s*출구)/g,
]

const storyText = (s) => [s.title, s.summary, ...s.blocks.map((b) => b.text ?? b.caption ?? '')].join('\n')

async function run(sample) {
  const res = await fetch(`${BASE}/api/generate-story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: { purpose: sample.purpose, purposeDetail: sample.purposeDetail ?? null, tone: 'polite', sourceDescription: sample.sourceDescription },
      images: sample.images,
    }),
  })
  const json = await res.json()
  if (!json.ok) return { error: json.error.code }
  const text = storyText(json.data)
  const input = [sample.sourceDescription, ...sample.images.map((i) => `${i.description} ${i.detectedText ?? ''}`)].join('\n')
  const verified = json.data.verificationItems.map((v) => v.text).join('\n')
  const flags = new Set()
  for (const re of SUSPICIOUS)
    for (const m of text.matchAll(re)) {
      const hit = m[0].replace(/\s+/g, '')
      // 숫자 부분만 비교: 사진 속 "6,500"이 본문에서 "6,500원"이 되는 경우는 근거가 있는 것
      const core = hit.replace(/[^\d,]/g, '') || hit
      const known = (s) => s.replace(/\s+/g, '').includes(core)
      if (!known(input) && !known(verified)) flags.add(m[0])
    }
  const aliases = new Set(sample.images.map((i) => i.alias))
  const badRefs = json.data.blocks.filter((b) => b.type === 'image' && !aliases.has(b.imageRef)).map((b) => b.imageRef)
  return { story: json.data, flags: [...flags], badRefs, usage: json.usage, model: json.model }
}

const lines = [`# AI 품질 점검 결과`, '', `- 실행: ${new Date().toISOString()}`, `- 회수: 목적 ${SAMPLES.length}종 × ${ROUNDS}회`, '']
let flagged = 0
let tokens = 0
for (const sample of SAMPLES) {
  lines.push(`## ${sample.purpose}${sample.purposeDetail ? ` (${sample.purposeDetail})` : ''}`, '', `입력: ${sample.sourceDescription}`, '')
  for (let r = 1; r <= ROUNDS; r++) {
    const out = await run(sample)
    if (out.error) {
      lines.push(`- ${r}회차: 오류 ${out.error}`)
      continue
    }
    tokens += out.usage.inputTokens + out.usage.outputTokens
    if (out.flags.length || out.badRefs.length) flagged++
    lines.push(
      `- ${r}회차 **${out.story.title}** (${out.model})`,
      `  - 확인 필요 항목: ${out.story.verificationItems.map((v) => `“${v.text}”`).join(', ') || '없음'}`,
      `  - 자동 의심 표시: ${out.flags.length ? out.flags.map((f) => `\`${f}\``).join(', ') : '없음'}`,
      `  - 잘못된 이미지 참조: ${out.badRefs.length ? out.badRefs.join(', ') : '없음'}`,
    )
    process.stdout.write('.')
  }
  lines.push('')
}
lines.splice(4, 0, `- 의심 표시가 있는 생성: ${flagged}건 / 총 토큰 ${tokens.toLocaleString()}`, '')
writeFileSync(OUT, lines.join('\n'))
console.log(`\n저장: ${OUT} (의심 ${flagged}건, 토큰 ${tokens})`)
