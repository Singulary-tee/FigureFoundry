---
name: motion-fluid-microinteractions
description: >
  Fluid 60fps micro-interactions, layout transitions, spring physics, and animated visual feedback using motion/react.
---

# Fluid Motion & Micro-Interactions

Guidelines for snappy, tactile, and natural micro-interactions and layout transitions.

## 1. Principles of Workbench Motion

1. **Subtle & Purposeful**: Animations should provide spatial context or confirm state changes, never delay the user.
2. **Spring Physics**: Use damp spring transitions for tactile physical feel:
   ```ts
   transition: { type: "spring", stiffness: 400, damping: 30 }
   ```
3. **Tab & Selection Indicators**:
   - Use `layoutId="activeTabIndicator"` with `motion.div` for sliding pill indicators.
4. **Modals & Drawers**:
   - Enter: `scale: [0.98, 1], opacity: [0, 1]`, duration: `0.15s`.
   - Exit: `opacity: [1, 0]`, duration: `0.1s`.

## 2. Status Morphs & Diff Highlights

- When a figure transitions from Staged to Approved, flash an emerald border pulse:
  `transition-all duration-300 border-emerald-500/80 bg-emerald-500/10`
- Diff toggles should cross-fade candidate vs. active specs cleanly.
