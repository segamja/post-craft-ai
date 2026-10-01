# PostCraft AI

사진과 짧은 설명으로 하나의 콘텐츠 Story를 만들고, 이를 Blog · Instagram · Facebook · Instagram Carousel로 변환·편집하는 AI SNS 콘텐츠 제작 도구입니다.

- 기준 문서: [개발 명세서 V1.1](docs/PostCraft_AI_프로젝트_개발명세서_V1.1.md), [개발 계획](docs/PostCraft_AI_개발계획_V1.0.md)
- 디자인: [design.md](public/images/stitch_design_document_setup/design.md) (Google Stitch 화면은 같은 폴더)

## 구조 (MVP)

| 영역 | 구현 |
|---|---|
| 화면 | React 19 · Vite · TypeScript · Tailwind v4 · React Router · Radix · dnd-kit |
| 데이터 | **브라우저 IndexedDB (Dexie)**. 단일 사용자, 로그인 없음. 다른 기기와 동기화되지 않음 |
| 서버 | **Vercel Functions** `api/*.ts`. OpenAI·Unsplash 호출만 하고 상태를 저장하지 않음 |
| AI | OpenAI Chat Completions + Structured Outputs (strict JSON Schema, Zod 재검증) |

```
사진 업로드(브라우저에서 HEIC 변환·EXIF 제거·2048px 축소) → IndexedDB
  └ AI 생성 (브라우저가 단계별로 호출, 단계 결과 즉시 저장, 실패한 단계부터 재시도)
     [1] /api/analyze-image  사진 1장씩 분석 (분석 없는 사진만)
     [2] /api/generate-story Story (원본)
     [3] /api/generate-platform × 3  Blog / Instagram / Facebook 병렬
     [4] /api/generate-carousel      Instagram 기반 슬라이드
```

- 명세의 Postgres 트리거·RPC·FK는 `src/lib/db/rules.ts`와 각 `features/*/api/*Repo.ts`의 IndexedDB 트랜잭션으로 같은 의미를 유지합니다.
- AI에게는 사진을 UUID 대신 `IMG1…` 별칭으로만 보여주고, 응답을 검증한 뒤 실제 ID로 매핑합니다 (`shared/alias.ts`).
- 서버와 클라이언트가 같은 Zod 스키마를 씁니다 (`shared/schemas`).

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 표)
npm run dev                  # http://localhost:5173  (/api/* 도 같은 서버에서 동작)
```

`OPENAI_API_KEY`가 비어 있으면 로컬에서는 **Mock 응답**으로 전체 흐름이 동작합니다 (`AI_MOCK=1`로 강제 가능).

### 환경변수 (서버 전용, `VITE_` 접두사 없음)

| 이름 | 설명 |
|---|---|
| `OPENAI_API_KEY` | OpenAI 키 |
| `OPENAI_MODEL_VISION` | 사진 분석 모델 (이미지 입력 지원) |
| `OPENAI_MODEL_TEXT` | 글 생성 모델 |
| `OPENAI_IMAGE_DETAIL` | `low` / `auto`(기본) / `high`. `auto`는 사진 1장에 입력 토큰이 수만 개까지 들 수 있어, 비용을 줄이려면 `low` |
| `UNSPLASH_ACCESS_KEY` | Unsplash API Access Key |
| `APP_ACCESS_TOKEN` | 설정하면 `/api` 호출에 접근 코드가 필요 (설정 화면에서 입력). **배포 시 권장** |
| `AI_MOCK` | `1`이면 키가 있어도 Mock 사용 |

## 스크립트

| 명령 | 내용 |
|---|---|
| `npm run dev` | 개발 서버 + 로컬 `/api` |
| `npm test` | Vitest: DB 규칙(DB-02~09), 스키마·별칭(UT-01~05), 파이프라인(TC-05~07), 화면(TC-01, 08~11), API |
| `npm run e2e` | Playwright (Chromium, OpenAI Mock): TC-02·03·06·10·12·13·16 |
| `npm run typecheck` · `npm run lint` | 타입 검사 · oxlint |
| `npm run build && npm run check:secrets` | 빌드 후 번들에 비밀값이 없는지 검사 |
| `npm run ai:quality -- --rounds 3` | 실제 API로 목적 8종 × N회 Story 생성 → `docs/AI_품질점검_결과.md` (dev 서버 실행 중이어야 함) |

처음 E2E를 돌릴 때는 `npx playwright install chromium`이 필요합니다.

## 배포 (Vercel)

1. Vercel에서 이 저장소를 Import → Framework: **Vite** (Build `npm run build`, Output `dist`). `api/` 폴더는 자동으로 Functions가 됩니다.
2. Project Settings → Environment Variables에 위 표의 값을 넣습니다. 운영 환경(`VERCEL_ENV=production`)에서는 키가 없으면 Mock으로 넘어가지 않고 오류를 냅니다.
3. **`APP_ACCESS_TOKEN`을 설정**하고, 사용자에게 접근 코드를 알려줍니다. 로그인이 없으므로 이 값이 없으면 누구나 `/api`를 호출해 OpenAI 비용을 쓸 수 있습니다. OpenAI 대시보드에도 월 사용 한도를 걸어두세요.
4. SPA 라우팅은 `vercel.json`의 rewrite로 처리됩니다.
5. 출시 전 확인: 개인정보처리방침·이용약관 초안 법무 검토(명세 Q-07), Unsplash Production 승인, `npm run ai:quality -- --rounds 3`.

## 폴더

```
api/            Vercel Functions (analyze-image, generate-*, unsplash-*) + _lib(프롬프트, OpenAI, Mock)
shared/         클라이언트·서버 공용: 도메인 타입, Zod 스키마, 별칭 매핑, 플랫폼 규칙, 오류 코드
src/lib/db/     IndexedDB 스키마와 무결성 규칙
src/features/   project · image · story · platform · carousel · ai(파이프라인) · editor · result · unsplash · consent
src/pages/      라우트 화면
e2e/            Playwright
scripts/        비밀값 검사, AI 품질 점검
```
