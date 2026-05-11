# Product Snapshot

## What This Project Is

Alex-Hou-2024-test-25 is a browser-based fluid playground: a React/Three.js app for configuring scenes, running a worker-backed SPH fluid simulation, viewing the result in 3D, and exporting captures from the browser.

## What It Does Today

- Runs a real-time SPH-style fluid simulation in a Web Worker.
- Renders the scene in Three.js with container bounds, helpers, obstacles, and fluid output.
- Supports two render paths:
  - `SSFR fluid surface`
  - `Instanced particle spheres`
- Supports SSFR debug views for:
  - `final`
  - `depth`
  - `thickness`
  - `normals`
- Lets the user tune fluid appearance live: water color, absorption, thickness scale, Fresnel power, blur radius, and blur iterations.
- Supports built-in starter scenes: `Dam break`, `Fountain`, and `Drop into pool`, each tuned with a better first-load camera angle.
- Supports two fluid source modes:
  - initial block placement
  - continuous emitter with particle cap
- Provides playback controls: play, pause, step, reset, speed.
- Shows live HUD stats: render FPS, step rate, particle count, sim time.
- Supports particle scalar coloring by speed, density, and pressure.
- Saves, loads, imports, exports, and deletes scene presets in `localStorage`.
- Exports PNG frame sequences and WebM recordings from the viewport.

## Architecture Decisions

- Frontend-only static app built with Vite, React, and TypeScript.
- Simulation stays off the main thread in a dedicated worker.
- Zustand is the state boundary for scene state, viewport state, presets, and rendering controls.
- Three.js owns the viewport, particle path, and SSFR multi-pass pipeline.
- SSFR is organized as staged passes plus an `SSFRRenderer` orchestrator.
- Built-in scene tuning and first-visit onboarding are driven from local scene metadata, not a backend.

## Operational Conventions

- Dev and preview serve on `0.0.0.0:8080`.
- `npm run build` is the production build path.
- `npm run serve:dist` is the plain static-host verification path for built output.
- Coverage is split between Vitest and Playwright.
- Keyboard shortcuts:
  - `Space` toggles play/pause
  - `R` resets the simulation

## Safety and Limits

- Unsafe simulation inputs are clamped before they reach the worker.
- Imported scenes are sanitized before use.
- Worker and render failures are surfaced to the user instead of failing silently.
- Persistence is browser-local only through `localStorage`; no backend persistence is merged.
