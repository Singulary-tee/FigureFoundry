---
name: mobile-ergonomics-responsive
description: >
  Thumb-zone ergonomics, minimum touch target guarantees (44px), mobile-first adaptive drawer layouts, and fluid responsive design.
---

# Mobile Ergonomics & Responsive Design

Guidelines for ensuring data-dense desktop workbenches are equally fast and ergonomic on mobile smartphones.

## 1. Touch Targets & Thumb-Zone Placement

- **Strict Minimum Touch Target**: All interactive controls must provide at least $44 \times 44\text{px}$ hit areas (`min-h-[44px] min-w-[44px]` or wrapped in flex containers with minimum sizing).
- **Bottom Navigation**: Place primary workspace view switchers (Figure Canvas, Encoding Controls, Agent Console) at the screen bottom within natural thumb reach.

## 2. Adaptive Viewport Patterns

- **Phone (<768px)**:
  - Sidebar folds into modal sheet / tabbed view.
  - Complex inspector docks fold into a bottom drawer or dedicated tab.
  - Vega figures compute auto-width (`containerRef.clientWidth`) to prevent horizontal overflow.
- **Tablet & Desktop (>=768px)**:
  - Multi-column side-by-side layout: Encodings Panel (left) + Canvas (center/right).
