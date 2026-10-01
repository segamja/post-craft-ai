# PostCraft AI UI 벤치마킹 및 Google Stitch 디자인 지시서

## 1. 문서 목적

이 문서는 PostCraft AI의 UI/UX를 설계하기 위한 벤치마킹 및 디자인 지시서이다.

목표는 Canva, Adobe Express, Buffer, Predis.ai, Jasper의 최신 UI/UX에서 장점을 참고하되 특정 서비스의 화면을 그대로 복제하지 않고, PostCraft AI의 핵심 가치에 맞는 독립적인 UI를 설계하는 것이다.

PostCraft AI의 핵심은 단순한 AI 글쓰기 서비스가 아니다.

> **사진 + 사용자 설명 + 콘텐츠 목적 → AI가 Story 생성 → 플랫폼별 콘텐츠 변환 → 사용자가 편집**

이라는 콘텐츠 제작 경험을 제공한다.

---

# 2. 벤치마킹 대상

## 2.1 Canva

### 벤치마킹 목적
**콘텐츠 편집 경험**

참고할 요소:

- 콘텐츠 중심 Workspace
- 이미지와 텍스트를 함께 편집하는 UI
- Preview 중심의 작업 방식
- 직관적인 편집 도구
- 콘텐츠 제작과 SNS Publishing의 연결
- Grid / 콘텐츠 관리 경험

### PostCraft 적용

Canva의 디자인 편집 경험을 참고하되 PostCraft에서는 디자인 자체보다 **AI가 생성한 Story와 SNS 콘텐츠를 편집하는 경험**에 집중한다.

---

# 3. Adobe Express

## 벤치마킹 목적

**콘텐츠 제작 → Preview → Schedule → Publish의 통합 Workflow**

참고할 요소:

- 콘텐츠 제작 Workspace
- Content Calendar
- Preview
- SNS 채널 선택
- 콘텐츠 상태 관리
- AI Caption
- 콘텐츠 Scheduling
- SNS Publishing

### PostCraft 적용

MVP에서는 Calendar와 Publishing을 구현하지 않는다.

그러나 향후 확장을 고려하여 UI 구조가 다음 기능을 수용할 수 있도록 설계한다.

```text
Create
↓
AI Generate
↓
Edit
↓
Preview
↓
Schedule
↓
Publish
↓
Analyze
```

MVP에서는 다음까지만 구현한다.

```text
Create
↓
AI Generate
↓
Edit
↓
Preview
↓
Save
```

---

# 4. Buffer

## 벤치마킹 목적

**전체 애플리케이션 구조와 Navigation**

Buffer의 2026년 UI 방향에서 특히 참고할 부분:

- 단순하고 차분한 UI
- 명확한 Sidebar
- 하나의 앱 안에서 여러 기능으로 이동하는 구조
- 콘텐츠 관리 중심의 Workspace
- Home Dashboard
- 콘텐츠 상태와 활동을 한 화면에서 파악하는 구조

### PostCraft 적용

PostCraft의 기본 App Shell은 Buffer의 장점을 참고한다.

```text
┌─────────────────────────────────────────────┐
│ PostCraft AI                                │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Home         │                              │
│ My Content   │       Main Workspace         │
│ New Content  │                              │
│ Calendar     │                              │
│ Settings     │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### 디자인 방향

Sidebar는 너무 많은 메뉴를 넣지 않는다.

MVP:

```text
Home
My Content
New Content
Settings
```

Phase 2:

```text
Calendar
Analytics
Brand Kit
```

---

# 5. Predis.ai

## 벤치마킹 목적

**AI 콘텐츠 생성 UX**

Predis의 핵심적인 경험을 참고한다.

```text
간단한 입력
      ↓
AI가 전체 콘텐츠 생성
      ↓
Preview
      ↓
Edit
      ↓
Regenerate
      ↓
Publish
```

### PostCraft 적용

PostCraft에서는 이 흐름을 사진 중심으로 변경한다.

```text
사진 업로드
    +
콘텐츠 목적
    +
짧은 설명
    ↓
AI 사진 분석
    ↓
AI Story
    ↓
Blog
Instagram
Facebook
Carousel
```

### 중요한 UX 원칙

사용자가 AI에게 복잡한 Prompt를 작성하도록 요구하지 않는다.

사용자는 다음 정도만 입력한다.

```text
사진
콘텐츠 목적
간단한 설명
```

나머지는 AI가 처리한다.

---

# 6. Jasper

## 벤치마킹 목적

**AI Workspace와 향후 Brand Voice / Content Governance**

참고할 요소:

- AI 중심 Workspace
- Brand Voice
- Style Guide
- 콘텐츠 관리
- AI 생성 결과의 일관성
- 여러 콘텐츠를 하나의 Workspace에서 관리하는 구조

### PostCraft 적용

MVP에서는 Brand Voice를 구현하지 않는다.

하지만 향후 다음 구조로 확장할 수 있도록 설계한다.

```text
Workspace
 ├── Content Projects
 ├── Brand Voice
 ├── Brand Kit
 ├── Style Guide
 └── AI Preferences
```

---

# 7. PostCraft AI UI의 최종 방향

5개 서비스를 그대로 복제하지 않는다.

각 서비스에서 다음 역할만 가져온다.

```text
Buffer
→ App Shell / Navigation

Canva
→ Content Editor

Adobe Express
→ Content Workflow / Calendar

Predis.ai
→ AI Generation UX

Jasper
→ AI Workspace / Brand System
```

이를 하나의 PostCraft AI 경험으로 통합한다.

---

# 8. 전체 UI 스타일

## Design Direction

### Clean Editorial + AI Creative Workspace

PostCraft AI는 복잡하고 화려한 AI 서비스처럼 보이지 않아야 한다.

다음과 같은 인상을 목표로 한다.

```text
Clean
Calm
Modern
Editorial
Visual
Creative
Professional
```

---

# 9. Visual Design Principles

## 9.1 색상

기본 배경:

- 매우 밝은 Neutral
- White
- Light Gray

텍스트:

- Black
- Dark Gray

Accent:

- 하나의 주 Accent Color만 사용

AI 기능을 표현하기 위해 모든 버튼에 보라색 Gradient나 Sparkle 아이콘을 사용하지 않는다.

---

## 9.2 카드

카드는 콘텐츠를 명확하게 구분하는 용도로 사용한다.

특징:

- White background
- subtle border
- 작은 shadow
- 10~14px 정도의 border radius

카드를 과도하게 중첩하지 않는다.

---

## 9.3 Typography

타이포그래피는 깔끔하고 읽기 쉬워야 한다.

Hierarchy:

```text
Page Title
    ↓
Section Title
    ↓
Card Title
    ↓
Body
    ↓
Caption
```

제목을 과도하게 크게 만들지 않는다.

---

# 10. Home 화면

Home은 사용자가 서비스에 들어왔을 때 무엇을 해야 하는지 바로 이해할 수 있어야 한다.

## 핵심 영역

```text
Welcome
↓
새 콘텐츠 만들기
↓
최근 콘텐츠
↓
최근 작업
```

예:

```text
안녕하세요.

오늘 어떤 콘텐츠를 만들어볼까요?

┌─────────────────────────┐
│   + 새 콘텐츠 만들기    │
└─────────────────────────┘

최근 콘텐츠

[여행 사진] [카페 방문] [제품 소개]
```

Home에서 너무 많은 Dashboard 정보를 보여주지 않는다.

MVP에서는 **콘텐츠 생성으로 빠르게 진입하는 것**을 최우선으로 한다.

---

# 11. New Content 화면

PostCraft의 가장 중요한 시작 화면이다.

## Layout

```text
┌─────────────────────────────────────────┐
│ 새 콘텐츠 만들기                         │
├─────────────────────────────────────────┤
│                                         │
│ 1. 사진 추가                             │
│                                         │
│ [ + 사진 업로드 ]                        │
│                                         │
│ [사진1] [사진2] [사진3] [사진4]          │
│                                         │
│ 2. 어떤 콘텐츠인가요?                   │
│                                         │
│ [여행] [일상] [맛집] [상품] [행사] [후기] │
│                                         │
│ 3. 사진에 대해 알려주세요               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 예: 제주도에서 가족과 2박 3일 여행... │ │
│ └─────────────────────────────────────┘ │
│                                         │
│             [ AI로 콘텐츠 만들기 ]       │
└─────────────────────────────────────────┘
```

## 핵심 UX

입력 항목을 최소화한다.

사용자는 AI Prompt Engineering을 할 필요가 없어야 한다.

---

# 12. AI Generation 화면

AI 생성 과정이 진행 중이라는 것을 명확하게 보여준다.

```text
콘텐츠를 만들고 있습니다.

✓ 사진 확인
✓ 사진 분석
● Story 만들기
○ Blog 만들기
○ Instagram 만들기
○ Facebook 만들기
○ Carousel 만들기
```

각 단계가 진행되는 느낌을 제공한다.

단순한 Spinner 하나만 표시하지 않는다.

---

# 13. Result Workspace

PostCraft의 핵심 화면이다.

## 기본 Layout

```text
┌─────────────────────────────────────────────┐
│ ← 내 콘텐츠                  저장            │
├────────────┬────────────────────────────────┤
│            │                                │
│ Story      │                                │
│ Blog       │          Preview               │
│ Instagram  │                                │
│ Facebook   │                                │
│            │                                │
│            │                                │
├────────────┴────────────────────────────────┤
│ Edit   Regenerate   Change Image             │
└─────────────────────────────────────────────┘
```

---

# 14. Content Tabs

다음 구조를 사용한다.

```text
Story | Blog | Instagram | Facebook
```

사용자가 탭을 이동하면 동일한 프로젝트의 다른 콘텐츠를 확인한다.

각 콘텐츠는 별도의 독립 프로젝트가 아니다.

```text
Project
  ↓
Story
  ├── Blog
  ├── Instagram
  └── Facebook
```

---

# 15. Story 화면

Story는 모든 콘텐츠의 원본이다.

화면 구성:

```text
Title
Summary

[사진 Preview]

Story Body

--------------------------------

AI Actions

[다시 생성]
[더 짧게]
[더 길게]
[친근하게]
[감성적으로]
```

Story가 지나치게 기술적으로 보이지 않도록 한다.

---

# 16. Instagram 화면

Instagram Preview를 중심으로 한다.

```text
┌─────────────────────┐
│                     │
│      Image          │
│                     │
├─────────────────────┤
│ Caption             │
│                     │
│ #travel #trip       │
└─────────────────────┘
```

기능:

- Caption 편집
- Hashtag 편집
- 이미지 변경
- AI 재생성
- Carousel 전환

---

# 17. Facebook 화면

Facebook은 긴 글과 이미지가 함께 보이는 Preview를 제공한다.

```text
Profile
────────────────────
Image

본문

해시태그
```

Facebook UI 자체를 복제하지 않고 일반적인 Social Post Preview로 표현한다.

---

# 18. Blog 화면

Blog는 긴 콘텐츠 중심으로 표현한다.

```text
Title

Hero Image

Introduction

Section 1
Image
Text

Section 2
Image
Text

Conclusion
```

Blog는 Instagram과 달리 넓은 본문 영역을 사용한다.

---

# 19. Carousel Editor

Carousel은 Canva의 편집 경험을 참고하되 훨씬 단순하게 만든다.

## Layout

```text
┌─────────────┬──────────────────────┬──────────────┐
│             │                      │              │
│ Slide List  │     Canvas           │ Properties   │
│             │                      │              │
│ [1]         │                      │ Image        │
│ [2]         │    Slide Preview     │ Text         │
│ [3]         │                      │              │
│ [4]         │                      │              │
│ [5]         │                      │              │
│             │                      │              │
└─────────────┴──────────────────────┴──────────────┘
```

### 기능

- Slide 선택
- Slide 순서 변경
- 이미지 변경
- 텍스트 편집
- AI 문구 재생성
- Slide 추가
- Slide 삭제

Slide 개수를 고정하지 않는다.

---

# 20. Image Management UX

사진은 PostCraft의 핵심 Asset이다.

따라서 사용자가 현재 어떤 사진을 사용하고 있는지 쉽게 이해할 수 있어야 한다.

### Thumbnail

```text
[Image 1]
[Image 2]
[Image 3]
```

### 기능

- Add
- Delete
- Replace
- Reorder

### 중요한 원칙

UI의 표시 순서와 이미지의 고유 ID를 분리한다.

```text
Image ID ≠ Display Order
```

---

# 21. AI Action UX

AI 기능은 화면을 압도하지 않아야 한다.

기본 AI Actions:

```text
✨ 다시 생성
짧게
길게
친근하게
전문적으로
감성적으로
```

AI 기능은 Contextual Action으로 배치한다.

예:

```text
본문 옆
→ 다시 생성

문장 선택
→ 짧게 / 다시 작성

Carousel Slide
→ 문구 다시 생성
```

---

# 22. AI 재생성 UX

사용자가 콘텐츠를 직접 수정한 상태에서 AI 재생성을 실행하면 데이터가 덮어써질 수 있다.

따라서 다음과 같은 Confirmation을 제공한다.

```text
현재 수정한 내용이 있습니다.

AI로 다시 생성하면 현재 수정 내용이
새로운 결과로 변경될 수 있습니다.

[취소]       [다시 생성]
```

---

# 23. My Content

프로젝트를 카드 형태로 관리한다.

```text
┌──────────────┐
│              │
│    Image     │
│              │
├──────────────┤
│ 제주 여행    │
│ Instagram    │
│ 2026.10.01   │
└──────────────┘
```

각 Project는 하나의 콘텐츠 프로젝트다.

사진 여러 장과 Story, SNS 결과가 하나의 프로젝트 안에 존재한다.

---

# 24. Responsive Design

## Desktop

```text
Sidebar
+
Main Workspace
```

## Tablet

```text
Compact Sidebar
+
Main Workspace
```

## Mobile

```text
Top Navigation
↓
Content
↓
Preview
```

Mobile에서는 Carousel Editor를 단순화한다.

---

# 25. 최신 UI Trend 반영

2026년의 방향성을 다음처럼 반영한다.

### 1. Calm UI

화려한 효과보다 집중할 수 있는 인터페이스를 사용한다.

### 2. Contextual AI

AI를 별도의 복잡한 Chat 화면에 넣기보다 사용자가 작업하는 위치에서 바로 사용할 수 있게 한다.

### 3. Content-first

Navigation보다 사용자가 만든 콘텐츠가 시각적 중심이 된다.

### 4. Progressive Disclosure

처음부터 모든 기능을 보여주지 않는다.

기본:

```text
Generate
Edit
Save
```

고급 기능:

```text
Rewrite
Brand Voice
Repurpose
Schedule
Analytics
```

### 5. Unified Workspace

AI 생성, 편집, Preview를 여러 페이지로 분리하지 않고 하나의 작업 공간에서 자연스럽게 연결한다.

### 6. Preview-driven UX

사용자가 최종 결과를 즉시 확인할 수 있어야 한다.

---

# 26. 사용하지 않을 디자인

다음 디자인은 사용하지 않는다.

- 과도한 Glassmorphism
- 과도한 Gradient
- 보라색 AI UI의 남용
- 모든 버튼의 Sparkle 아이콘
- 지나치게 둥근 카드
- 과도한 Shadow
- 화면을 가득 채우는 Dashboard Widget
- 복잡한 Sidebar
- 지나치게 많은 설정
- ChatGPT와 같은 대화형 UI를 서비스 전체의 중심으로 사용하는 방식

PostCraft AI는 "AI와 대화하는 서비스"가 아니라 **AI를 이용해 콘텐츠를 만드는 서비스**이다.

---

# 27. Stitch 디자인 생성 지시

Google Stitch는 위의 벤치마킹 기준을 바탕으로 PostCraft AI의 전체 UI를 디자인한다.

## 반드시 생성할 화면

1. Home
2. New Content
3. AI Generation
4. Story Editor
5. Blog Editor
6. Instagram Editor
7. Facebook Editor
8. Carousel Editor
9. My Content
10. Settings

## 우선 디자인할 화면

1순위:

```text
New Content
Result Workspace
Carousel Editor
```

2순위:

```text
Home
My Content
```

3순위:

```text
Settings
```

---

# 28. Stitch 최종 디자인 요구사항

PostCraft AI는 다음의 디자인 조합을 지향한다.

```text
Buffer
→ Calm App Shell

Canva
→ Visual Editor

Adobe Express
→ Content Workflow

Predis.ai
→ AI Generation Experience

Jasper
→ AI Workspace Concept
```

그러나 최종 결과물은 특정 서비스의 복제품처럼 보이면 안 된다.

PostCraft AI만의 핵심 경험은 다음이다.

```text
PHOTO
  ↓