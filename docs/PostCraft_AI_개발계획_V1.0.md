# PostCraft AI — 프로젝트 개발계획 및 구현 순서

## Context
- 현재 저장소에는 코드가 없고, 다음 두 가지만 있다.
  - `docs/PostCraft_AI_프로젝트_개발명세서_V1.1.md`: 데이터 모델, DB, RPC, AI 파이프라인, §25 구현 순서
  - `public/images/stitch_design_document_setup/`: Google Stitch로 만든 화면 4종(home_dashboard, new_content, story_result_workspace, instagram_carousel_editor)과 code.html, 로고, design.md
- 이 계획의 목적: 명세서의 §25 16단계를 **디자인 화면과 연결**하고, 둘이 충돌하는 부분을 먼저 정리한 뒤 실행할 수 있는 순서로 만든다.
- 승인 후 첫 작업: 이 계획을 `docs/PostCraft_AI_개발계획_V1.0.md`로 저장한다.

---

## 1. 디자인과 명세 대조 결과 (착수 전 확정할 것)

### 1.1 디자인 토큰 충돌 — **확정 필요**
| 출처 | Primary | Accent | 폰트 |
|---|---|---|---|
| `design.md` (기준 문서) | `#0D5C75` Deep Teal | 단일 Accent | Pretendard |
| `calm_editorial_ai/DESIGN.md` | `#004357` / container `#0D5C75` | secondary 주황 | Inter |
| Stitch 생성 `code.html` 4종 + `postcraft_studio/DESIGN.md` | `#091426` Navy | `#0051D5` Blue | Inter |
| 로고 SVG | `#0F172A` | `#2563EB` | Inter |

**권장:** `design.md`를 단일 기준으로 삼는다(Teal primary, Pretendard, radius 8/12/16, elevation 0~floating). Stitch HTML은 **레이아웃 참고용**으로만 쓰고 색상은 쓰지 않는다. 로고의 점(.) 색은 primary로 맞춘다.
→ Tailwind v4이므로 `tailwind.config.ts` 없이 `src/index.css`의 `:root` 변수와 `@theme inline`에 design.md 토큰을 옮긴다(shadcn 변수명 호환).

### 1.2 디자인에 있지만 MVP 범위가 아닌 요소 → 숨기거나 단순하게 대체
| 화면 | 디자인 요소 | 처리 |
|---|---|---|
| 홈 | 월간 누적 제작, 최다 발행 채널 통계 카드 | Analytics는 Phase 2 → **제거**. "오늘 AI 한도" 카드만 남긴다(ai_jobs 집계) |
| 홈 | 카테고리 필터 칩 | 유지 (`purpose` 필터) |
| 새 콘텐츠 | "임시 저장" 버튼 | 자동 저장(D-06)으로 대체하고, 헤더에 저장 상태 표시 |
| 새 콘텐츠 | "스마트 맥락 추론 활성", 예상 소요 8초 | 제거 (근거 데이터 없음) |
| Story 결과 | 인라인 "AI 에디터: 문장 다듬기/짧게/길게/감성적으로" | AI Rewrite는 Phase 2 → **제거** |
| Story 결과 | "단위 재생성 옵션: 톤 및 감성 레벨" 칩 | MVP는 단위 재생성만 → "Story 전체 다시 생성" 버튼만 남긴다 |
| Carousel | "지금 바로 발행 예약" | 스케줄링은 Phase 2 → 제거 |
| Carousel | ZIP 전체 내보내기 | MVP 내보내기는 복사뿐 → 제거(또는 Phase 2) |
| Carousel | AI 자동 정제, 후킹형/감성형 제안 칩 | 제거 |
| Carousel | 텍스트 레이아웃(하단/중앙/상단), 채우기/맞추기/배경흐림 | 데이터 모델에 없음 → **제거**, 하단 오버레이 하나로 고정 |
| Carousel | 1:1 / 4:5 토글 | 유지 (명세 §13.7, UI 상태만, 저장 안 함) |
| 공통 헤더 | 로고가 사이드바와 헤더에 중복 | 사이드바에만 둔다. 헤더에는 프로젝트명과 저장 상태 |
| 탭 | design.md는 Carousel을 별도 탭으로 둠 | 명세 라우트(`tab=story|blog|instagram|facebook`)에 `carousel`을 추가하고, Instagram 하위 콘텐츠로 표시 |

### 1.3 디자인에 없는 화면 → design.md 토큰으로 직접 만든다
로그인/회원가입, 동의(`/onboarding/consent`), 내 콘텐츠 목록(`/projects`, 페이지네이션), 설정(계정 삭제 포함), 생성 진행 표시(§13.5), 404/권한 없음, 재생성 경고 모달, CONFLICT 모달, Unsplash 검색 모달, 복사 모달.

### 1.4 명세 §34 미결 사항 기본값 (변경하지 않으면 이대로 진행)
Blog 대상은 일반(MD/HTML), 일일 한도 50건, 이미지 최대 10장, 톤은 해요체/반말, 모델은 환경변수로 관리. (가입 방식은 1.5에 따라 해당 없음)

### 1.5 MVP 아키텍처 변경: Supabase 제외, 로컬 DB (2026-10-01 결정)
| 영역 | 명세 V1.1 | MVP 변경 |
|---|---|---|
| 데이터 | Supabase PostgreSQL + RLS | **브라우저 IndexedDB (Dexie)** `src/lib/db/` |
| 이미지 원본 | Supabase Storage + Signed URL | IndexedDB `imageBlobs` 테이블에 Blob 저장, 화면 표시는 `URL.createObjectURL` |
| 트리거·RPC·FK | Postgres | `src/lib/db/rules.ts` + 각 repo의 Dexie `rw` 트랜잭션 (같은 의미 유지) |
| Storage 정리 큐·Cron | storage-cleanup | 같은 트랜잭션에서 Blob 즉시 삭제, 앱 시작 시 `runStartupMaintenance()` |
| 인증 | Supabase Auth (이메일) | **없음, 단일 사용자.** AI 처리 동의는 1회 받고 로컬에 기록 |
| 서버 함수 | Supabase Edge Functions | **Vercel Functions** `api/*` (OpenAI, Unsplash 호출만, 상태 없음) |
| 일일 한도 | ai_jobs 서버 집계 | 로컬 ai_jobs는 UI 안내용. 비용 보호는 `APP_ACCESS_TOKEN` 헤더 검사 + OpenAI 계정 사용 한도 |
| 동시 편집 | updated_at 낙관적 잠금 | 같은 방식 (같은 브라우저의 여러 탭 간) |
| 조회 상태 | TanStack Query | DB 조회는 Dexie `useLiveQuery`(탭 간 자동 반영). TanStack Query는 `/api` 호출에만 사용 |

주의할 점
- 데이터는 그 브라우저에만 있다. 다른 기기와 동기화되지 않고, 사이트 데이터를 지우면 사라진다. 시작 시 `navigator.storage.persist()`를 요청한다.
- AI 호출 시 이미지를 브라우저에서 base64로 보내야 한다. Vercel 요청 본문 한도(4.5MB) 때문에 분석용으로 더 작게 줄이고, 이미지 1장씩 호출한다.
- 나중에 서버 DB로 옮길 때는 repo 함수의 시그니처를 유지하고 내부 구현만 바꾼다.

---

## 2. 화면 ↔ 라우트 ↔ 디자인 매핑

| 라우트 | 화면 | 참고 디자인 | 핵심 feature |
|---|---|---|---|
| `/` | 홈 | home_dashboard | project, ai(한도) |
| `/projects` | 내 콘텐츠 | home_dashboard 카드 그리드 재사용 | project |
| `/projects/:id` | 입력 단계 | new_content (2단: 좌측 사진+설명, 우측 목적/톤/생성 CTA) | image, project, ai |
| `/projects/:id/result?tab=story` | Story | story_result_workspace (3단: 사진 패널, 블록 편집기, 인스펙터) | story, image |
| `?tab=blog|instagram|facebook` | 플랫폼 | story_result_workspace 레이아웃 재사용 | platform |
| `?tab=carousel` | Carousel | instagram_carousel_editor (3단: 슬라이드 목록, 1:1/4:5 프리뷰, 슬라이드 편집) | carousel |
| `/onboarding/consent` `/settings` | — | 디자인 없음 | 동의, 데이터 관리 |

공용 컴포넌트 (Stitch HTML에서 구조를 가져옴): `AppShell`(Sidebar + TopBar), `SaveStatusIndicator`, `CreditMeter`(사이드바 하단 "AI 생성 한도"), `PlatformTabs`(stale 점 포함), `VerificationBadge`(앰버), `ImageThumb`(상태: pending, ready, failed), `ProjectCard`, `RegenerateButton`(경고 모달 포함).

---

## 3. 구현 순서 (명세 §25를 디자인 기준으로 재구성)

> 원칙: 단계마다 완료 기준(테스트 ID)을 통과한 뒤 다음 단계로 넘어가고, 단계마다 커밋한다. (명세 §26)

### Phase A — 기반 (1~3주차)
| # | 작업 | 산출물 | 완료 기준 |
|---|---|---|---|
| A0 | ✅ **디자인 토큰 정리** (1.1 확정) | `src/index.css`(`@theme` 토큰 + shadcn 변수), Pretendard Variable(dynamic subset) | 토큰 샘플 페이지 |
| A1 | ✅ Vite + React + TS + Tailwind + shadcn/ui + Router + TanStack Query + Zustand, 폴더 구조(§16), `shared/` 경로 별칭, Vitest | `src/app/*` | 빈 AppShell 렌더 |
| A2 | ✅ **AppShell UI** (Stitch 공통 Sidebar/TopBar 이식) | `components/common/AppShell` 등 | 4개 라우트 이동 |
| A3 | ✅ 로컬 DB: Dexie 스키마, 무결성 규칙, repo(project·image·story·platform·carousel·aiJob) | `src/lib/db/*`, `src/features/*/api/*Repo.ts` | DB-02~09 (Vitest + fake-indexeddb). DB-01(RLS)은 해당 없음 |
| A4 | ✅ `shared/` 먼저 정의: Zod 스키마(`ai.ts`, `blocks.ts`, `api.ts`), `platformRules.ts`, `errorCodes.ts`, 도메인 타입과 파생 함수 | `shared/*`, `features/*/model` | UT-01, UT-03, UT-05 |
| A5 | ✅ AI 처리 동의 화면 + 로컬 기록 + 라우트 가드(CONSENT_REQUIRED) | `features/consent` | 최초 진입 → 동의 → 홈 |

### Phase B — 프로젝트·이미지 (3~5주차)
| # | 작업 | 참고 디자인 | 완료 기준 |
|---|---|---|---|
| B1 | ✅ Project CRUD, 홈(최근 프로젝트 + 한도 카드), `/projects` 목록(20개 단위, purpose 필터) | home_dashboard | TC-01 |
| B2 | ✅ 입력 화면 골격: 목적 카드 8종(+기타 상세), 톤 라디오, 설명 1,000자 카운터, 자동 저장 | new_content 우측·하단 | 새로고침해도 값 유지 |
| B3 | ✅ 업로드 파이프라인: HEIC 변환, EXIF 회전 적용, 2048px 리사이즈, JPEG 0.85, 동시 3개, pending → ready/failed, Blob → Object URL 캐시 | new_content 업로드 영역·썸네일 | TC-02, TC-14, UT-04 |
| B4 | ✅ dnd-kit 정렬(키보드 지원), 삭제·교체 RPC 연동, "#1 대표" 표시 | new_content 썸네일 스트립 | TC-03~05 |
| B5 | ✅ 앱 시작 시 정리(오래된 pending/failed 이미지, 5분 넘은 running 작업) | — | 테스트 포함 |

### Phase C — AI 파이프라인 (5~7주차)
| # | 작업 | 완료 기준 |
|---|---|---|
| C1 | ✅ Vercel Functions 공통 `api/_lib`: 토큰 검사, Zod 검증, openai 클라이언트, errors, prompts/. 클라이언트: alias 매핑, aiJobs 기록, **OpenAI Mock** | UT-02 |
| C2 | ✅ `api/analyze-image`: 분석이 없는 이미지만 분석, alt 반영 | 분석 결과 저장 |
| C3 | ✅ `api/generate-story` + 클라이언트 오케스트레이터(`features/ai`) + **진행 표시 UI**(§13.5) | Story 저장, status=generated |
| C4 | ✅ `api/generate-platform` ×3 병렬, 부분 실패와 재시도 | TC-06, TC-07 |
| C5 | ✅ `api/generate-carousel` | 슬라이드 저장 |

### Phase D — 결과 편집 화면 (7~10주차)
| # | 작업 | 참고 디자인 | 완료 기준 |
|---|---|---|---|
| D1 | ✅ 결과 3단 레이아웃 + PlatformTabs + 사진 패널(IMG 별칭, 드래그로 블록 삽입) | story_result_workspace | 탭 전환 |
| D2 | ✅ Story 블록 편집기(heading/paragraph/image, 블록 추가), 자동 저장(1초 debounce, 백오프 재시도, beforeunload), 낙관적 잠금 + CONFLICT 모달 | story_result_workspace 중앙 | TC-10, TC-11 |
| D3 | ✅ 인스펙터: 확인 필요 정보(앰버 칩, 삭제/확인 완료), 재생성, 클립보드 복사(일반 텍스트/MD/HTML), 채널별 변환 상태 | story_result_workspace 우측 | 복사 결과 확인 |
| D4 | ✅ Blog/Instagram/Facebook 편집기와 복사(캡션+해시태그, 글자 수·해시태그 제한 표시) | 같은 레이아웃 | 플랫폼 규칙 위반 시 경고 |
| D5 | ✅ Carousel 편집기: 슬라이드 목록 정렬/추가/삭제, 1:1·4:5 프리뷰, 이미지 변경, 제목 40자·본문 200자, 이미지 없는 슬라이드는 텍스트 카드로 표시 | instagram_carousel_editor | Carousel 편집 저장 |
| D6 | ✅ stale 배지/배너, 덮어쓰기 경고 모달, 이전 내용 되돌리기 1회 | 탭 "동기화 필요" 배지 | TC-08, TC-09 |

### Phase E — 마무리 (10~12주차)
| # | 작업 | 완료 기준 |
|---|---|---|
| E1 | ✅ Unsplash 검색 모달, track-download, attribution 표시와 복사 포함 | TC-16 |
| E2 | ✅ 진행 상태 복원(ai_jobs running 조회), 오류 코드별 UI 정리, 접근성(aria-live, aria-label), 반응형(모바일은 Carousel 편집 단순화) | TC-15 |
| E3 | ✅ 설정: 동의 내역, 전체 데이터 삭제, 저장 용량 표시, 개인정보처리방침·약관 페이지 | 삭제 후 DB 비어 있음 |
| E4 | ✅ Playwright E2E 전체, AI 품질 점검(목적 8종 × 3회), 번들 비밀값 검사 | §24 전체, TC-12, TC-13 |
| E5 | ⏳ 준비 완료(README 배포 절차, vercel.json, 운영 환경 Mock 차단) · 실제 배포는 Vercel 계정에서 진행: Vercel(SPA rewrite `vercel.json`, Functions 환경변수 `OPENAI_*`, `UNSPLASH_ACCESS_KEY`, `APP_ACCESS_TOKEN`) | 배포 URL에서 전체 흐름 |

### 의존 관계 요약
`A0 → A1 → A2` 와 `A3 → A4`는 병렬 진행 가능 → `A5 → B1 → B2 → B3 → B4` → `C1 → C2 → C3 → C4 → C5` → `D1 → D2 → D3 → D4 → D5 → D6` → `E1~E3 (병렬)` → `E4 → E5`
- 프론트엔드 UI(D1의 레이아웃, D5 프리뷰)는 Mock 데이터로 Phase C와 병렬로 먼저 만들 수 있다.

---

## 4. 재사용할 디자인 자산
- `stitch_design_document_setup/*/code.html`: Tailwind 마크업 구조(그리드, 카드, 탭)를 React 컴포넌트로 옮긴다. 색상 클래스는 토큰 이름으로 바꾼다.
- `postcraft_ai_wordmark_logo/code.html`: SVG를 `src/components/common/Logo.tsx`로 옮기고 색상을 토큰으로 바꾼다.
- `design.md` §7 컴포넌트 명세: VerificationBadge, Stale 점, Carousel 타임라인, Auto-save 표시 구현의 기준.

## 5. 검증 방법
- 각 단계 완료 기준의 테스트 ID(DB-xx, UT-xx, TC-xx)를 `vitest`(DB 포함), `playwright`로 실행한다.
- UI 단계는 `npm run dev`로 띄우고, 같은 뷰포트에서 Stitch `screen.png`와 나란히 놓고 비교한다(레이아웃 일치, 색상은 design.md 토큰).
- AI 단계는 OpenAI Mock으로 E2E를 돌리고, 출시 전에 실제 키로 품질 점검을 한다.
