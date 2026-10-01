---
name: Calm Editorial AI
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#40484c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#70787d'
  outline-variant: '#bfc8cd'
  surface-tint: '#1e667f'
  primary: '#004357'
  on-primary: '#ffffff'
  primary-container: '#0d5c75'
  on-primary-container: '#93d3ef'
  inverse-primary: '#90cfec'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#702500'
  on-tertiary: '#ffffff'
  tertiary-container: '#973400'
  on-tertiary-container: '#ffbaa0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bde9ff'
  primary-fixed-dim: '#90cfec'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#004d64'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb599'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#7f2b00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '600'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-focus, editorial-first creative workspace designed for social media managers, visual storytellers, and brand strategists. It eschews the ubiquitous neon tropes and loud decorative gradients of early generative AI tools in favor of an understated, utilitarian, and calm operational environment. 

The aesthetic merges **Corporate / Modern clarity** with **Clean Editorial restraint**:
- **Clarity over spectacle**: AI interactions feel like reliable editorial assistants rather than autonomous novelties.
- **Content-first surfaces**: The workspace recedes into balanced neutral backdrops so that photo assets, aspect-ratio previews, and generated copy remain the visual focal point.
- **Tactile precision**: High legibility, strict structural alignment, whisper-soft architectural borders, and deliberate color signals anchor user confidence throughout complex multi-step generation pipelines.

## Colors

The color palette grounds professional content creation through intentional functional roles:

- **Primary (`#0D5C75`)**: Deep Teal. Applied to primary CTAs, active step indicators, selected navigation items, and brand anchors. It conveys calculated authority and calm focus.
- **Secondary (`#D97706`)**: Verification Amber. Dedicated specifically to informational checks, fact-checking tags, and AI source validation badges.
- **Tertiary (`#EA580C`)**: Stale Warning Orange. Reserved for status dots, stale story asset notifications, and prompt drift alerts requiring user review.
- **Neutral (`#F8F9FA`)**: Warm Alabaster Canvas. Serves as the global backdrop to prevent eye strain during prolonged creative sessions.
- **Surfaces & Borders**: Pure `#FFFFFF` for primary cards, generation panels, and inspector sidebars, defined by crisp structural borders in `#E5E7EB` (Border Neutral) and text rendered in `#111827` (Text High-Contrast) down to `#6B7280` (Muted Meta).

## Typography

The type system is powered by **Inter**, chosen for its tall x-height, neutral geometric geometry, and technical legibility in data-dense editorial layouts. 

- **Display & Headlines**: Tightly tracked (`-0.025em` to `-0.01em`) with a semi-bold weight (`600`) to anchor views without overwhelming canvas previews. Mobile variants scale headlines proportionally below 32px to safeguard narrow aspect-ratio workspaces.
- **Body Text**: Tuned for scanning long-form captions, hashtag groups, and generation transcripts. Line heights are spaced generously at 1.5x–1.55x.
- **Labels & Microcopy**: Form labels, aspect ratio flags (`1:1`, `9:16`), and metadata indicators use weights `500` and `600` with subtle positive letter spacing to maintain crisp optical separation at small scales.

## Layout & Spacing

The workspace implements a structured layout designed for multi-pane workflows:

- **Desktop (1200px+)**: A three-pane fixed-fluid layout. Left rail: navigation and generation step pipeline (280px fixed). Center stage: infinite/dynamic canvas preview (fluid). Right rail: contextual parameter inspector and copy editor (360px fixed).
- **Tablet (768px – 1199px)**: The left generation pipeline collapses into an icon dock (64px fixed). Center canvas scales fluidly; the contextual parameter inspector transitions to an overlay drawer.
- **Mobile (< 768px)**: Single column with a stacked workflow. Bottom navigation bar hosts modal sheets for generation controls, maximizing screen real estate for asset previews.
- **Rhythm**: All paddings and internal gaps strictly align with multiples of `0.25rem` (4px), using `space-md` (`0.75rem`) as the baseline gap for grouped controls and `space-xl` (`2rem`) for major container separations.

## Elevation & Depth

Visual hierarchy relies on crisp surface separation rather than heavy shadows:

- **Border-First Architecture**: Low-contrast outlines (`1px solid #E5E7EB`) define the boundaries of every canvas tile, sidebar, modal, and tool group.
- **Tonal Stacking**: The foundation canvas rests at `#F8F9FA`. Intermediary surfaces (such as secondary panels, generation steps, and inactive tabs) sit at `#F3F4F6`. High-focus foreground cards, canvas preview artboards, and active popovers use pure `#FFFFFF`.
- **Minimal Ambient Depth**: Shadows are nearly flat, utilized exclusively for floating floating toolbars and active drag previews:
  - *Floating Toolbar*: `0 2px 4px rgba(13, 92, 117, 0.04), 0 4px 12px rgba(17, 24, 39, 0.06)`
  - *Active Modal / Dropdown*: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.06)`
- No fuzzy colored glows, skeuomorphic bevels, or high-intensity drop shadows are permitted.

## Shapes

The design system employs a **Soft** shape language (`roundedness: 1`), providing an architectural, structured feel suitable for precise content editing:

- **Standard Elements (0.25rem / 4px)**: Input fields, control chips, preview badges, select triggers, and action buttons.
- **Containers & Cards (0.5rem / 8px)**: Canvas preview viewports, sidebar panels, media asset tiles, and dropdown containers (`rounded-lg`).
- **Overlays & Dialogs (0.75rem / 12px)**: Central pipeline modals and floating command palettes (`rounded-xl`).
- **Indicator Exceptions**: Verification badges, notification pills, and status dots utilize fully circular bounds (`rounded-full`) to contrast against structural rectilinear cards.

## Components

### Buttons
- **Primary**: Solid Deep Teal (`#0D5C75`) background with `#FFFFFF` text. Minimal hover transition to `#094457`. Height: 36px (compact) or 40px (default). Padding: `0 16px`. Shape: `rounded` (4px).
- **Secondary / Ghost**: Pure `#FFFFFF` background, 1px border in `#E5E7EB`, `#111827` text. Hover changes background to `#F9FAFB` and border to `#D1D5DB`.
- **Destructive**: Subdued white surface with `#DC2626` text and border; active state fills with `#FEE2E2`.

### Verification Badges & Stale Indicators
- **Factual Verification Item**: Distinct badge with `#FEF3C7` background, `#92400E` text, and `#F59E0B` subtle border. Preceded by a 12px verification icon. Never uses blue checkmarks.
- **Stale Story Changes**: Absolute-positioned 8px dot badge in Tertiary Orange (`#EA580C`) with a 2px `#FFFFFF` outline, signaling uncommitted prompt changes or expired preview assets.

### Input Fields & Prompt Inputs
- **Base Input**: `#FFFFFF` background, `1px solid #E5E7EB`, text `#111827`, placeholder `#9CA3AF`. 
- **Focus State**: `1px solid #0D5C75` with a `2px` ring in `rgba(13, 92, 117, 0.15)`. No default browser outlines.
- **AI Textarea**: Clean, borderless internal prompt surface surrounded by a unified container containing quick-action aspect ratio tags and generation toggles at the bottom edge.

### Chips & Aspect Ratio Selectors
- **Default Chip**: Neutral `#F3F4F6` background, `#374151` text, `0.25rem` radius. 
- **Active Selection**: Deep Teal background tint (`rgba(13, 92, 117, 0.08)`), text `#0D5C75`, border `1px solid #0D5C75`.

### Cards & Canvas Viewports
- **Media Asset Card**: Pure `#FFFFFF` card, `1px solid #E5E7EB`, `rounded-lg` (8px). Visual content rendered with an inset 1px inner border (`rgba(0,0,0,0.04)`) to isolate bright image edges from white backgrounds.
- **Selected State**: Replaces border with a crisp `2px solid #0D5C75` outline without altering layout box sizing.

### Multi-Step Pipeline Indicator
- Horizontal step flow with numerical indicators enclosed in 24px circles. Completed steps render in Deep Teal (`#0D5C75`) with white text; active steps show a 2px Deep Teal border with an inner white fill; pending steps render in `#E5E7EB` with `#6B7280` text. Connecting lines are 1px solid `#E5E7EB`.