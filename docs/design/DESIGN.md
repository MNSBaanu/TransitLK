---
name: Fleet Operational Intelligence
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464650'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777681'
  outline-variant: '#c7c5d1'
  surface-tint: '#535999'
  primary: '#000249'
  on-primary: '#ffffff'
  primary-container: '#0d1253'
  on-primary-container: '#797ec2'
  inverse-primary: '#bec2ff'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#410007'
  on-tertiary-container: '#e15358'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bec2ff'
  on-primary-fixed: '#0d1253'
  on-primary-fixed-variant: '#3b4180'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b1'
  on-tertiary-fixed: '#410007'
  on-tertiary-fixed-variant: '#8d1321'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
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
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

This design system is engineered for high-stakes logistics and public transport management. The brand personality is rooted in **Reliability, Precision, and Utility**. It prioritizes information density over decoration, ensuring that depot managers can make rapid, data-driven decisions without cognitive overload.

The design style is **Corporate / Modern**, leaning heavily into a systematic, utilitarian aesthetic. It utilizes a rigorous grid-based structure to organize complex datasets, ensuring a sense of calm and control within high-pressure environments. The visual language conveys institutional trust through stable geometry and a disciplined color application.

## Colors

The palette is anchored by a **Deep Midnight Navy (#000249)** to project absolute authority and **Pure Black (#000000)** for secondary structural elements. A **Deep Burgundy (#7A0016)** serves as the tertiary accent color for high-priority operational callouts. The background uses a crisp **Off-White (#F8FAFC)** to maximize screen real estate and reduce glare during long shifts.

Functional color is the most critical element of this system:
- **Emerald Green**: Indicates "On-time" or "Available." Used for healthy system states.
- **Amber**: Indicates "Delayed." Used for items requiring monitoring.
- **Crimson Red**: Indicates "Conflicts" or "Maintenance." Reserved for immediate blockers.
- **Neutral Grey**: Used for inactive states, labels, and borders to keep the focus on active data.

## Typography

**Inter** is selected for its exceptional legibility in data-heavy contexts. The system utilizes "tabular numbers" (tnum) for all data grids to ensure that columns of figures align perfectly for easy scanning.

Hierarchy is established through weight rather than size alone. Large headlines are kept compact to save vertical space. **Label-caps** are utilized for table headers and metadata categories, providing a clear distinction between the "label" and the "value." For mobile views, typography scales down slightly, but the `body-md` (14px) remains the minimum for critical operational data to maintain readability in vibration-heavy environments (e.g., handheld devices in the yard).

## Layout & Spacing

This design system uses a **fixed-fluid hybrid grid**. The sidebar and navigation elements are fixed-width, while the central data workspace expands to fill the screen (Fluid). This maximizes the number of columns visible in data grids and calendar views.

A **4px baseline grid** governs all spacing. 
- **High-Density Density**: Use `sm` (8px) padding for table cells and form inputs to fit more data above the fold.
- **Standard Density**: Use `md` (16px) for card containers and general page margins.
- **Breakpoints**: 
    - Desktop: 12-column grid.
    - Tablet: 6-column grid.
    - Mobile: 4-column grid with simplified list views replacing wide tables.

## Elevation & Depth

To maintain a "utility-first" feel, depth is created primarily through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Background)**: #F8FAFC. The base canvas.
- **Level 1 (Cards/Tables)**: White (#FFFFFF) with a 1px border (#E2E8F0). This is the primary surface for all data.
- **Level 2 (Modals/Popovers)**: White (#FFFFFF) with a soft, 12% opacity neutral shadow to provide focus without appearing decorative.
- **Active State**: Use a 2px primary midnight navy left-border on list items or table rows to indicate selection.

## Shapes

The shape language is **Soft (0.25rem)**. This provides just enough rounding to feel modern and professional without sacrificing the rigid, industrial feel required for a logistics platform. 

Buttons, input fields, and status badges all share the same `rounded-sm` (4px) corner radius. Status badges (pills) for "On-time" or "Delayed" are the only exception, utilizing a fully rounded (pill-shaped) radius to distinguish them as non-interactive status indicators.

## Components

### Buttons
- **Primary**: Solid Midnight Navy (#000249) with white text. High-contrast for critical actions like "Confirm Schedule."
- **Secondary**: Solid Black (#000000) or ghost style with black border and text. Used for "Cancel" or "Edit Details."
- **Tertiary**: Deep Burgundy (#7A0016) used for specific high-priority operational actions.

### Data Grids & Tables
- **Header**: Light grey background (#F1F5F9) with `label-caps` typography.
- **Rows**: Alternating subtle zebra-striping is permitted for readability. Hover states must highlight the entire row in a very pale blue.

### Status Badges
- Small, compact containers with high-contrast text. Use a light background version of the status color (e.g., 10% opacity Emerald) with the full-strength color for the text and a small 6px dot icon.

### Input Fields
- Structured with clear labels. Focus states use a 2px Midnight Navy ring. For high-density views, use "In-cell" editing where the input border only appears on hover.

### Calendar Widgets
- Use a rigid 15-minute or 30-minute block grid. Conflict states must be overlaid with a Crimson Red diagonal hatch pattern to ensure they are visible even to colorblind users.

### Map Containers
- Integrated with a "Dark Mode" or "Greyscale" map style to ensure the colorful fleet pins (Primary Midnight Navy, Status Emerald) remain the focal point.