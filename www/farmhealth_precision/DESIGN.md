---
name: FarmHealth Precision
colors:
  surface: '#0d1513'
  surface-dim: '#0d1513'
  surface-bright: '#333b38'
  surface-container-lowest: '#08100e'
  surface-container-low: '#151d1b'
  surface-container: '#19211f'
  surface-container-high: '#232c29'
  surface-container-highest: '#2e3634'
  on-surface: '#dce4e0'
  on-surface-variant: '#c4c8c1'
  inverse-surface: '#dce4e0'
  inverse-on-surface: '#2a3230'
  outline: '#8e928c'
  outline-variant: '#434843'
  surface-tint: '#bdcabd'
  primary: '#bdcabd'
  on-primary: '#28332a'
  primary-container: '#0f1a12'
  on-primary-container: '#778479'
  inverse-primary: '#556157'
  secondary: '#4ae183'
  on-secondary: '#003919'
  secondary-container: '#06bb63'
  on-secondary-container: '#00431f'
  tertiary: '#eec209'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cea700'
  on-tertiary-container: '#4e3d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d9e6d9'
  primary-fixed-dim: '#bdcabd'
  on-primary-fixed: '#131e16'
  on-primary-fixed-variant: '#3e4a40'
  secondary-fixed: '#6bfe9c'
  secondary-fixed-dim: '#4ae183'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffe084'
  tertiary-fixed-dim: '#eec209'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#0d1513'
  on-background: '#dce4e0'
  surface-variant: '#2e3634'
  stress-high: '#e67e22'
  stress-critical: '#e74c3c'
  soil-clay: '#a0522d'
  health-optimal: '#27ae60'
  text-primary: '#ffffff'
  text-muted: '#94a3b8'
  border-glass: rgba(255, 255, 255, 0.1)
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.08em
  stat-display:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  grid-margin: 24px
  gutter: 16px
  card-padding: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system for FarmHealth is anchored in **Scientific Precision** and **Ecological Professionalism**. It targets agricultural researchers, modern commercial farmers, and agronomists who require immediate, actionable intelligence from complex geospatial data. The aesthetic is "Nocturnal High-Tech"—optimized for both the specialized office environment and high-glare outdoor field use.

The design style is a hybrid of **Corporate Modern** and **Glassmorphism**. It utilizes a sophisticated dark-mode architecture to reduce eye strain, while employing frosted-glass layers to maintain a sense of depth and hierarchy. The UI evokes the feeling of a professional GIS (Geographic Information System) tool—clean, reliable, and authoritative—ensuring that the "invisible" data (satellite stress detection) feels tangible and trustworthy.

## Colors
The palette is built on a "Deep Forest" foundation. The primary and neutral colors are near-black greens (`#0a1210`, `#0f1a12`), providing a high-contrast base for data visualizations. 

**Vibrant Emerald (#2ecc71)** is reserved for "Healthy" status indicators and primary action paths. A secondary "Agricultural Stress" spectrum is utilized for health legends: **Warning Yellow (#f1c40f)** for early-stage stress, **Orange (#e67e22)** for moderate stress, and **Soil Brown (#a0522d)** for bare earth or non-vegetative surfaces. Text follows a strict hierarchy of pure white for primary readings and muted slate-greys for metadata and supporting technical labels.

## Typography
Readability of complex data is the absolute priority. **Inter** is the primary typeface for its exceptional legibility in dense UI environments. It is used for all functional text, headings, and body content.

To lean into the technical nature of the satellite monitoring platform, **JetBrains Mono** is introduced for labels, coordinate data, and "Satellite Metadata" tags. This monospaced font provides a visual "tooling" feel, distinguishing raw data inputs from human-readable AI advice. Headlines use tight letter spacing and heavy weights to command attention, while body text uses generous line heights to ensure long-form AI reports remain accessible.

## Layout & Spacing
The layout employs a **Fixed Grid** model for the sidebar controls and a **Fluid Map Area** for the primary visualization. On desktop, the control panel is fixed to the left (360px), allowing the map to fill the remaining viewport. On mobile, the layout reflows into a bottom-sheet architecture, keeping the map visible at the top while tools are accessible via a swipe-up gesture.

A consistent **8px base unit** governs all spacing. Vertical rhythm is maintained through 16px (medium) and 32px (large) stacks. The "Layer Selector" and "Legend" components use a dense 8px gutter to maximize information density without sacrificing touch-target size for field use.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Glassmorphism** rather than traditional drop shadows.
- **Level 0 (Base):** The dark neutral `#0a1210` background (Map/Root).
- **Level 1 (Panels):** `#0f1a12` with a subtle 1px border of `rgba(255,255,255,0.08)`.
- **Level 2 (Overlays):** Glassmorphic surfaces using `backdrop-filter: blur(12px)` and a semi-transparent `rgba(15, 26, 18, 0.7)` fill.
- **Level 3 (Modals/Popups):** Similar to Level 2 but with a more pronounced white inner-glow border (0.5px) to simulate a physical glass edge.

Interactive elements (buttons/inputs) use **low-contrast outlines** that brighten upon hover, providing a precise, electronic response feel.

## Shapes
The shape language is **Soft (0.25rem / 4px)**. This choice strikes a balance between the rigid, "square" nature of scientific charts and the modern, approachable feel of a digital tool. 

Small border radii are applied to data cards, inputs, and map-control groups. Status badges and "Pill" buttons (like the GPS Walk trigger) use a fully rounded radius (`rounded-full`) to differentiate them as high-priority, interactive triggers against the more structured, rectangular data containers.

## Components
- **Buttons:** Primary buttons are Solid Emerald with dark text. Secondary buttons are "Ghost" style—transparent with an Emerald border. The "GPS Walk" button is a floating action button (FAB) that uses a high-contrast shadow to separate it from the map.
- **Cards:** Use a 1px border and a subtle gradient background from `#0f1a12` to `#0a1210`. The "Yield Report" card features a thick 3px Emerald left-border to indicate "High Health."
- **Badges:** Small, high-contrast labels for "LIVE," "NEW," or satellite sources (e.g., "SENTINEL-2"). Use JetBrains Mono for text.
- **Inputs:** Dark backgrounds with a 1px border. On focus, the border transitions to Emerald with a subtle outer glow.
- **Legend Bar:** A continuous horizontal gradient or segmented color blocks representing the health scale, paired with numeric range labels (e.g., "0.15 - 0.30").
- **Status Indicators:** Icons (e.g., `⚠️` or `✅`) paired with the "Stress Spectrum" colors to provide immediate at-a-glance health context.