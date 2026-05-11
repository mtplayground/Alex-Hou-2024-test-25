# Product Snapshot

## What This Project Is

Alex-Hou-2024-test-25 is a browser-based fluid simulation playground. It lets a user configure a scene, run a particle-based fluid simulation in real time, inspect the result in a 3D viewport, and export captures from the browser.

## What It Does Today

- Runs a worker-backed SPH-style fluid simulation in the browser.
- Renders the scene with Three.js, including particles, container bounds, helpers, and obstacle boxes.
- Supports built-in starter scenes: `Dam break`, `Fountain`, and `Drop into pool`.
- Lets the user edit container size, obstacles, fluid source mode, and simulation parameters from a control rail.
- Supports two fluid source modes:
  - initial block placement
  - continuous emitter with particle cap
- Provides playback controls: play, pause, step, reset, and speed adjustment.
- Shows a live HUD with FPS, simulation step rate, particle count, and elapsed sim time.
- Supports visualization modes by speed, density, and pressure.
- Saves, loads, imports, exports, and deletes scene presets via `localStorage`.
- Exports PNG frame sequences and WebM recordings from the viewport.

## Architecture Decisions

- Frontend-only app built with Vite, React, and TypeScript.
- Simulation stepping runs in a Web Worker; the main thread owns UI and rendering.
- Three.js handles the viewport and particle rendering.
- Zustand is the main state layer for scene/editor/view state.
- The app is shipped as a static site; production output is the `dist/` directory.

## Operational Conventions

- Dev server and preview run on `0.0.0.0:8080`.
- `npm run build` is the production build path.
- `npm run serve:dist` is the plain static-server verification path for built output.
- Test coverage is split between Vitest and Playwright.
- Keyboard shortcuts currently include:
  - `Space` for play/pause
  - `R` for reset

## Safety and Limits

- The app clamps unsafe simulation inputs such as timestep, viscosity, and particle count.
- Imported scenes are sanitized before use.
- Worker/render failures are surfaced to the user instead of failing silently.
- The current persistence model is browser-local presets in `localStorage`; no backend persistence is merged.
