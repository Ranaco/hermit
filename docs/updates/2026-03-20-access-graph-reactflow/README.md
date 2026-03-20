# Access Graph React Flow Rewrite

> Date: `2026-03-20`
> Scope: web dashboard graph page, dashboard layout, frontend dependency update

This update captures the graph-page rewrite that moved the access graph from a hand-positioned custom canvas to a React Flow-based workspace board.

## Summary

The graph page was reworked to behave more like a schema visualizer and less like a freeform node dump.

Main outcomes:

- replaced the custom SVG and absolute-position canvas with React Flow
- made the graph page use the full available dashboard content area
- kept the page aligned with the existing light-first Hermit design system
- preserved the right-side inspector as the place for access reasoning
- retained filtering and search while improving zoom, pan, and navigation behavior

## What Changed

### 1. React Flow Integration

The graph page now uses `@xyflow/react` as the rendering engine.

Implemented:

- React Flow canvas with pan and zoom
- built-in controls
- minimap
- dotted background
- smooth routed edges
- custom node renderer for Hermit entities

Dependency added:

- `@xyflow/react`

Important file:

- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\dashboard\graph\page.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\package.json`

### 2. Full-Width Dashboard Page Support

The graph no longer lives inside the normal fixed-width dashboard content frame.

Implemented:

- optional `fullWidth` support on the shared dashboard layout
- optional `contentClassName` override for page-specific sizing
- graph page now opts into that wider layout so the board can fill the main pane

Important file:

- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\dashboard-layout.tsx`

### 3. Graph UX Direction

The page now follows a schema-browser pattern instead of a loose graph sketch.

Implemented:

- top control bar with search and type filters
- cleaner node cards with typed headers and compact metadata
- edge emphasis tied to node focus
- side inspector kept separate from board rendering
- full-height board and inspector pairing

Design notes:

- light-first appearance
- dark-compatible through the existing token system
- neutral board surface instead of decorative gradients or glass
- React Flow controls styled to match the product shell

## Verification

Completed:

- `npm install -w @hermit/web @xyflow/react`
- `npm run build -w @hermit/web`

Browser verification:

- confirmed the page renders as a React Flow board at `http://localhost:3000/dashboard/graph`
- verified live graph data populates nodes and edges
- confirmed no console errors during the verification pass

## Notes

- The graph still uses the existing access-graph API shape; this update was a frontend rendering rewrite, not a graph-data backend redesign.
- The inspector remains the canonical place for effective access detail.
- The React Flow board currently uses a deterministic column layout derived from Hermit node types rather than freeform drag persistence.
