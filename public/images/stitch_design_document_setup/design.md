# PostCraft AI Design System Specification (design.md)

## 1. Brand Identity & Overview
- **Service Name:** PostCraft AI (포스트크래프트 AI)
- **Positioning:** 사진과 사용자 입력 기반의 멀티플랫폼 SNS 콘텐츠(Story, Blog, Instagram, Facebook, Carousel) 제작 & 스마트 에디터
- **Design Metaphor / Philosophy:** *Clean Editorial + AI Creative Workspace*
  - Buffer의 차분하고 직관적인 App Shell & Navigation
  - Canva의 드래그 앤 드롭 및 카드/슬라이드 시각적 편집 인터페이스
  - Adobe Express의 콘텐츠 중심 프리뷰 및 채널별 퍼블리싱/내보내기 워크플로우
  - Predis.ai의 직관적인 다단계 AI 생성 피드백 루프
  - Jasper의 체계적인 멀티 콘텐츠 워크스페이스 구조

---

## 2. Design Principles & Anti-Patterns
### 핵심 원칙
1. **Calm & Editorial:** 과도한 AI 그래디언트나 사이버틱한 네온 효과를 지양하고, 실제 잡지나 프리미엄 에디터처럼 단정하고 가독성 높은 인터페이스를 제공한다.
2. **Content-First & Visual:** 텍스트 프롬프트 창보다 실제 사용자의 '사진'과 '결과물 미리보기'가 화면의 70% 이상을 차지하도록 시각적 위계를 집중한다.
3. **Contextual AI:** 별도의 독립 챗봇 창 대신, 문장이나 슬라이드, 이미지 단위의 인라인 AI 액션(단축/확장, 톤 변환, 캡션 재생성)을 배치한다.
4. **Deterministic Hierarchy (No Fake AI):** 사실 확인이 필요한 항목(`verificationItems`)은 노란색 칩으로 투명하게 표기하며 사용자가 수정할 수 있도록 유도한다.

### 금지 사항 (Anti-Patterns)
- ❌ 남발하는 보라색/무지개 그라디언트 및 화려한 글래스모피즘
- ❌ 모든 버튼에 반짝이(✨ Sparkle) 아이콘 도배 금지
- ❌ 지나치게 둥근 카드나 짙은 그림자
- ❌ 화면을 복잡하게 채우는 무의미한 위젯 및 설정 항목

---

## 3. Color System
PostCraft AI는 신뢰감 있는 딥 잉크(Deep Ink) 텍스트와 산뜻한 프라이머리 액센트, 절제된 중립 캔버스 배경을 사용합니다.

### Primary Palette
- `primary`: `#0D5C75` (Deep Teal / Editorial Blue - 주 버튼, 활성 탭 인디케이터, 브랜드 컬러)
- `primary-hover`: `#094659`
- `primary-light`: `#E8F4F7` (뱃지 배경, 선택된 슬라이드 테두리 및 은은한 하이라이트)
- `primary-dark`: `#073342`

### Neutral Scale (Background & Surface)
- `background`: `#F8F9FA` (Clean Off-White Canvas)
- `surface`: `#FFFFFF` (Card, Sidebar, Floating Panels)
- `surface-hover`: `#F1F3F5`
- `border`: `#E5E7EB` (Subtle 1px border)
- `border-focus`: `#0D5C75`

### Text & Ink Scale
- `text-primary`: `#111827` (가장 선명한 본문 및 타이틀)
- `text-secondary`: `#4B5563` (설명, 메타데이터, 부제)
- `text-muted`: `#9CA3AF` (비활성 라벨, 플레이스홀더)
- `text-inverse`: `#FFFFFF`

### Functional / Semantic Colors
- `warning` / `verification`: `#D97706` (Amber 600 - 사실 확인 필요 알림)
- `warning-bg`: `#FEF3C7` (Amber 50)
- `success`: `#10B981` (Emerald 500 - 완료, 저장됨, 연결됨)
- `success-bg`: `#ECFDF5`
- `danger`: `#EF4444` (Rose 500 - 삭제, 에러, 업로드 실패)
- `danger-bg`: `#FEF2F2`
- `stale-dot`: `#F59E0B` (Story 변경으로 인한 하위 플랫폼 업데이트 필요 인디케이터)

---

## 4. Typography Scale
- **Primary Font Family:** `-apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- **Monospace (for tokens/code/wordcounts):** `ui-monospace, "SF Mono", Menlo, Consolas, monospace`

### Type Scale
- `display` (Hero/Empty state): 28px / Line-height 1.3 / Font-weight 700
- `h1` (Page Title): 22px / Line-height 1.35 / Font-weight 700
- `h2` (Section / Tab Title): 18px / Line-height 1.4 / Font-weight 600
- `h3` (Card Title / Subsection): 15px / Line-height 1.45 / Font-weight 600
- `body-lg`: 15px / Line-height 1.6 / Font-weight 400
- `body` (Default text): 14px / Line-height 1.6 / Font-weight 400
- `body-sm` (Captions, Meta): 12px / Line-height 1.5 / Font-weight 500
- `badge` (Tags, Verification): 11px / Line-height 1.4 / Font-weight 600

---

## 5. Spacing, Elevation & Radii
### Spacing (8pt Base Grid)
- 4px (`0.5`), 8px (`1`), 12px (`1.5`), 16px (`2`), 24px (`3`), 32px (`4`), 48px (`6`)

### Border Radius
- Buttons / Badges: `8px` (`rounded-lg`)
- Cards / Containers / Image Thumbnails: `12px` (`rounded-xl`)
- Modals / Flyout Sheets: `16px` (`rounded-2xl`)

### Elevation & Shadows
- `elevation-0`: border 1px solid `#E5E7EB` (기본 패널 분할선)
- `elevation-1`: `0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)` (기본 카드)
- `elevation-2`: `0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)` (호버 카드, 팝오버)
- `elevation-floating`: `0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.04)` (모달, 인라인 액션 툴바)

---

## 6. Layout & App Shell Architecture (Buffer-inspired)
- **Top Bar (Global Status Header):**
  - 서비스 로고 ("PostCraft AI") + 활성 프로젝트명
  - 자동 저장 상태 인디케이터 ("● 자동 저장됨" / "저장 중..." / 1초 디바운스 표시)
  - 상단 우측: 일일 생성 크레딧 잔여량 (예: "AI 크레딧 42/50"), 내보내기/복사 모달 버튼, 프로필 아바타
- **Persistent Left Navigation (Sidebar):**
  - `홈 (Home)`: 최근 프로젝트 대시보드
  - `내 콘텐츠 (My Content)`: 프로젝트 카드 그리드 및 검색
  - `+ 새 콘텐츠 (New Content)`: 프라이머리 생성 CTA 버튼
  - `설정 (Settings)`: API, 계정, 동의 내역
- **Main Workspace Canvas:**
  - 상단 탭 네비게이션: `Story` ⏐ `Blog` ⏐ `Instagram (● Stale)` ⏐ `Facebook` ⏐ `Carousel`
  - 3단 스플릿 레이아웃 (Result Workspace):
    1. **좌측: 사진 풀(Asset Drawer)** - 업로드된 사진 드래그&드롭 리오더, Unsplash 추가, 본문 드래그 삽입
    2. **중앙: 주 편집 캔버스 (Live Interactive Preview)** - 각 플랫폼에 최적화된 WYSIWYG 렌더링
    3. **우측: 스마트 인스펙터 (AI Assistant & Validation)** - 사실 검증(`verificationItems`), 톤 조절, 캡션 복사, 해시태그 관리

---

## 7. Interactive UI Components
1. **Verification Item Badge:**
   - 앰버 컬러 테두리 및 칩 ("⚠️ 사진/설명에서 확인되지 않음 - 확인하기")
2. **Stale Badge on Platform Tabs:**
   - 주황색 원형 점(`●`)과 툴팁 ("Story 원본이 수정되었습니다. 내용을 갱신해보세요")
3. **Carousel Slide Timeline (Canva-inspired):**
   - 하단 썸네일 스트립 + 중앙 1:1 인스타그램 프리뷰 프레임 + 슬라이드별 타이틀/본문 오버레이 텍스트 박스
4. **Auto-save & Status indicator:**
   - 초록색 점과 함께 시각적 안정감을 제공
