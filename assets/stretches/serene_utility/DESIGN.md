---
name: Serene Utility
colors:
  surface: '#f7faf3'
  surface-dim: '#d8dbd4'
  surface-bright: '#f7faf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5ed'
  surface-container: '#ecefe8'
  surface-container-high: '#e6e9e2'
  surface-container-highest: '#e0e4dc'
  on-surface: '#191d18'
  on-surface-variant: '#414844'
  inverse-surface: '#2d312d'
  inverse-on-surface: '#eff2eb'
  outline: '#727973'
  outline-variant: '#c1c8c2'
  surface-tint: '#446554'
  primary: '#446554'
  on-primary: '#ffffff'
  primary-container: '#7ea18d'
  on-primary-container: '#163728'
  inverse-primary: '#abcfb9'
  secondary: '#4d6357'
  on-secondary: '#ffffff'
  secondary-container: '#cfe9d9'
  on-secondary-container: '#53695d'
  tertiary: '#7d562b'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf9060'
  on-tertiary-container: '#492a03'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c6ebd5'
  primary-fixed-dim: '#abcfb9'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#2d4d3d'
  secondary-fixed: '#cfe9d9'
  secondary-fixed-dim: '#b3ccbd'
  on-secondary-fixed: '#0a2016'
  on-secondary-fixed-variant: '#354b40'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#f1bd89'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#623f16'
  background: '#f7faf3'
  on-background: '#191d18'
  surface-variant: '#e0e4dc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 20px
  card-gap: 16px
  element-spacing: 12px
  section-margin: 32px
---

## Brand & Style
The design system is anchored in a philosophy of "Serene Utility." It targets individuals seeking to declutter their mental space through organized life management. The aesthetic is a fusion of **Soft Minimalism** and **Tactile Modernism**, prioritizing a calming user experience that feels as natural and unhurried as physical paper. 

The emotional response should be one of "controlled relief"—the feeling of seeing a messy desk finally cleared. This is achieved through a restricted, nature-inspired palette, heavy use of negative space to prevent cognitive overload, and high-quality typography that emphasizes legibility over flair. The UI stays out of the way, acting as a quiet assistant rather than a demanding interface.

## Colors
The color strategy utilizes a sophisticated earth-toned palette to drive focus and emotional regulation.

- **Primary Canvas:** The main page background uses `bg-sage` (#B7D0C1) to provide a soft, organic foundation that reduces eye strain compared to pure white.
- **Surface & Depth:** `paper` (#FFFFFF) is reserved for interactive cards and primary content containers, creating clear separation from the background. `beige` (#E0E0D9) serves as a grounding neutral for authentication and transitionary states.
- **Action & Emphasis:** `green` (#7EA18D) serves as the primary driver for progress and positive action. `tan` (#A4784A) and `coral` (#D45341) provide semantic clarity for financial tracking and high-priority alerts respectively.
- **Typography:** Contrast is maintained through `ink` (#131713) for maximum readability, with `ink-soft` used to diminish the hierarchy of meta-data.

## Typography
This design system utilizes **Inter** for its systematic, utilitarian precision. The typographic hierarchy is designed to be highly functional for at-a-glance scanning.

- **Headlines:** Use tight letter-spacing and bold weights to ground the top of cards and pages.
- **Body Text:** Set with generous line-heights to ensure that lists and descriptions feel airy.
- **Labels:** Small caps or increased letter spacing should be used for badges and category headers to differentiate them from actionable body text.
- **Scaling:** On mobile, limit display sizes to 32px to ensure titles do not wrap awkwardly or crowd the viewport.

## Layout & Spacing
The layout follows a **Single-Column Mobile-First** model, emphasizing vertical flow and thumb-friendly interactions.

- **Grid:** A 4-column fluid grid is used within cards, but the primary layout is a single centered column with 20px side margins.
- **Rhythm:** A 4px baseline grid ensures vertical consistency. Space between major cards should be 16px to maintain a cohesive but distinct stack.
- **Scrolling:** All scrollbars must be hidden to maintain the "clean slate" aesthetic. Use overscroll bounciness to indicate the end of content.
- **Safe Areas:** Ensure the floating navigation bar accounts for bottom safe areas on modern mobile devices, floating at least 16px above the screen bottom.

## Elevation & Depth
Depth is communicated through **Ambient Shadows** and tonal layering rather than harsh borders.

- **Base Layer:** The `bg-sage` background is the lowest level.
- **Mid Layer (Cards):** Primary content cards use `paper` white and a soft, highly diffused shadow (e.g., `0px 4px 20px rgba(0, 0, 0, 0.04)`). This creates a "levitating" effect that suggests the cards are easy to move or interact with.
- **Top Layer (Navigation):** The floating pill-navigation uses a slightly stronger shadow and `paper` background to sit clearly above the scrolling content.
- **Interactive States:** When pressed, cards should subtly scale down (98%) and their shadow should tighten, simulating physical pressure.

## Shapes
The shape language is defined by **High Radii**, contributing to the friendly and non-threatening brand personality.

- **Primary Cards:** Use a consistent `24px` (rounded-xl) corner radius.
- **Buttons & Inputs:** Follow a pill-shaped convention or a minimum of `12px` to ensure they feel soft to the touch.
- **Selection Indicators:** Progress bars and active tab indicators should have fully rounded (capsule) ends.
- **Dividers:** Use `line` (#CBCCC5) with a 1px thickness, but prefer using whitespace as a separator whenever possible to reduce visual noise.

## Components
Consistent component styling ensures the design system feels like a single, unified tool.

- **Floating Nav:** A pill-shaped container centered at the bottom. Icons use `ink-soft`, with the active state transitioning to `green`.
- **Large Action Button (FAB):** A perfect circle or soft-square centered in the floating nav, using `green` background and a white `+` icon. This is the primary focal point of the UI.
- **Progress Cards:** Background is `paper`. The progress bar uses a two-tone approach: `green` for the filled portion and `green-tint` for the unfilled track. Text within cards should follow the defined typography hierarchy.
- **List Items & Badges:** List items should have 12px vertical padding. Badges (e.g., for `tan` or `coral` categories) use a 10% opacity background of the label color with 100% opacity text for high legibility without being jarring.
- **Charts:** Line and bar charts should use `green` for primary data. Chart axes should be minimal, using `line` for the subtle grid and `ink-soft` for labels.
- **Input Fields:** Use `paper-dim` for the field background with a `12px` radius. The border should only appear on focus using `green`.