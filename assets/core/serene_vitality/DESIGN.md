---
name: Serene Vitality
colors:
  surface: '#faf9f6'
  surface-dim: '#dadad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f1'
  surface-container: '#eeeeeb'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e3e3e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#414844'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#727973'
  outline-variant: '#c1c8c2'
  surface-tint: '#446554'
  primary: '#446554'
  on-primary: '#ffffff'
  primary-container: '#7ea18d'
  on-primary-container: '#163728'
  inverse-primary: '#abcfb9'
  secondary: '#7d562b'
  on-secondary: '#ffffff'
  secondary-container: '#fdc893'
  on-secondary-container: '#785227'
  tertiary: '#4d6357'
  on-tertiary: '#ffffff'
  tertiary-container: '#879f91'
  on-tertiary-container: '#20362b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c6ebd5'
  primary-fixed-dim: '#abcfb9'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#2d4d3d'
  secondary-fixed: '#ffdcbd'
  secondary-fixed-dim: '#f1bd89'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#623f16'
  tertiary-fixed: '#cfe9d9'
  tertiary-fixed-dim: '#b3ccbd'
  on-tertiary-fixed: '#0a2016'
  on-tertiary-fixed-variant: '#354b40'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e3e0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
---

## Brand & Style
The design system for this fitness application is rooted in a serene, utility-focused aesthetic that merges the structured hierarchy of Material Design 3 with a calming, organic palette. The target audience seeks a mindful approach to fitness—one that emphasizes longevity and wellness over aggressive intensity.

The style is **Corporate / Modern** with a **Minimalist** lean. It utilizes the "Surface-Container" logic of MD3 to create a clear information architecture. The UI should evoke a sense of quiet competence, using generous whitespace and soft transitions to reduce cognitive load during physical activity.

## Colors
The color strategy employs a "Tonal Harmony" approach. The primary Sage Green (#7EA18D) acts as the anchor for action states and progress indicators. The light sage background (#B7D0C1) provides a low-contrast, easy-on-the-eyes canvas for daytime use, while the Dark Mode shifts to a deep charcoal-green to maintain the serene atmosphere.

The Warm Brown (#A4784A) is used for secondary accents, specifically for recovery metrics, rest periods, or nutritional data, providing a grounding contrast to the greens. Error states use a muted Red (#D45341) to ensure visibility without breaking the overall calm of the interface.

## Typography
This design system relies exclusively on **Inter** to ensure maximum legibility and a systematic, utilitarian feel. The hierarchy follows MD3 specifications, using weight variations rather than font swaps to differentiate data from descriptive text.

For the fitness context, "Display" sizes are reserved for primary metrics (like heart rate or step count), while "Headline" levels are used for workout titles. Letter spacing is slightly increased for "Label" roles to ensure readability on small wearable screens or during motion.

## Layout & Spacing
The layout follows a **Fluid Grid** model with an 8px baseline rhythm. On mobile devices, a 4-column grid is used with 16px side margins. For tablet and desktop, the system expands to 12 columns with a maximum content width of 1200px.

Spacing is used to group related health metrics. Containers should use `spacing.md` for internal padding. Vertical rhythm is strictly enforced to ensure that even data-dense screens feel organized and breathable.

## Elevation & Depth
Elevation is expressed through **Tonal Layers** rather than heavy shadows. In light mode, containers are slightly lighter or darker versions of the sage background to create "steps" in the UI. 

When shadows are required for floating action buttons or active cards, use "Ambient Shadows": extremely soft, low-opacity (#000000 at 8%), and diffused. This prevents the UI from feeling "heavy" and maintains the serene, flat-plus aesthetic.

## Shapes
The shape language is defined by **Rounded** corners (0.5rem base). This choice softens the "utility" aspect of the app, making the interface feel more approachable and organic—mimicking forms found in nature.

- **Small components** (Buttons, Input fields): 8px radius.
- **Medium components** (Cards, Dialogs): 16px radius (`rounded-lg`).
- **Large components** (Bottom sheets): 24px radius (`rounded-xl`) on top corners.

## Components
### Buttons
Primary action buttons use a solid fill of the Primary color with white text. Secondary buttons use an outlined style with the Primary color. All buttons feature a 48dp minimum touch target height to accommodate use during exercise.

### Cards
Cards are the primary vehicle for data. They should use a "Surface-Container" color—slightly lighter than the background in dark mode, and a crisp white or very light sage in light mode. Cards should never have borders; depth is strictly tonal.

### Chips
Used for filtering workout types (e.g., "Yoga", "HIIT"). These use the Secondary color (#A4784A) at 10% opacity for the background and 100% opacity for the text when in an unselected state.

### Input Fields
Filled text fields with a bottom indicator line (standard MD3 style). The fill should be a subtly darker tint of the background to ensure they look "sunken" and ready for input.

### Progress Indicators
Circular and linear progress bars must use the Primary color for the "filled" portion and the Secondary color at 20% opacity for the "track," visually linking effort (Primary) with the grounding base (Secondary).