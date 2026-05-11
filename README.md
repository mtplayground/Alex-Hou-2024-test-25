# Alex-Hou-2024-test-25

Browser-based fluid playground scaffolded with Vite, React, and TypeScript.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Three.js
- Zustand
- Vitest
- Playwright
- ESLint
- Prettier

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app is configured to serve on `0.0.0.0:8080`.

## Quality checks

```bash
npm run lint
npm run format
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
```

## UI, render, and test foundation

- `tailwind.config.js`: Tailwind theme and content scanning
- `postcss.config.js`: Tailwind + Autoprefixer pipeline
- `components.json`: shadcn/ui project configuration
- `src/components/ui`: shared UI primitives
- `src/lib/utils.ts`: shared `cn` helper for class composition
- `src/render/lighting.ts`: shared ambient + directional scene lighting
- `src/render/materials.ts`: shared cube and particle material factories
- `src/render/threeViewport.ts`: renderer, scene, perspective camera, OrbitControls, resize, and frame loop lifecycle
- `src/render/helloCube.ts`: Three.js smoke scene lifecycle
- `src/store/helloCubeStore.ts`: Zustand store for the smoke controls
- `vitest.config.ts`: unit test configuration
- `playwright.config.ts`: browser smoke-test configuration
- `.env.example`: documented frontend defaults

## Directory layout

- `src/sim`: simulation modules
- `src/render`: rendering modules
- `src/ui`: UI composition and presentation
- `src/store`: app state modules
- `src/workers`: worker entrypoints and message plumbing
- `e2e`: Playwright smoke tests

Issue #9 adds shared ambient/directional lighting and a baseline particle material, exercised by an instanced-sphere preview inside the container scene.

Issue #10 adds pure SPH smoothing-kernel functions for poly6, spiky gradient, and viscosity laplacian, with fixed-value unit coverage.

Issue #11 adds a 3D spatial hash grid for insert/query and smoothing-radius neighbor search, with unit coverage for raw bucket queries and filtered neighbor lookup.

Issue #12 adds a structure-of-arrays particle buffer built on `Float32Array` plus a shared `SimParams` baseline for upcoming density, pressure, and integration passes.

Issue #13 adds the first density-and-pressure computation pass, using poly6 kernel sums over hashed neighbors and writing equation-of-state pressures back into the shared particle buffers.

Issue #14 adds the force-accumulation pass, combining pressure-gradient, viscosity, and gravity contributions into each particle's typed-array force vector.

Issue #15 adds semi-implicit Euler integration plus damped collisions against the axis-aligned simulation container and local obstacle boxes.

Issue #16 adds a top-level `Simulation` class that initializes particle state, runs the density/force/integration pipeline per step, exposes position snapshots, and supports deterministic reset behavior.

Issue #17 adds the worker-side message protocol plus a simulation host that processes control commands and transfers `Float32Array` position frames back to the main thread.

Issue #18 adds a main-thread `SimulationClient` wrapper that spawns the worker, sends typed control messages, and exposes frame/error/ready subscriptions for incoming worker events.

Issue #19 connects those worker frames to the Three.js smoke scene, updating instanced particle geometry from transferred position buffers every render cycle.

Issue #20 adds the first durable scene data model plus a dedicated Zustand store for container dimensions, obstacles, fluid source, and simulation parameters.

Issue #21 renders scene obstacles in the Three.js smoke test and forwards that obstacle list through the worker boundary so simulation collisions use the same boxes.

Issue #22 replaces the hardcoded preview particle seed with deterministic initial-fluid block placement, generating a jittered lattice from the scene definition whenever the simulation initializes or resets.

Issue #23 adds continuous emitter mode with a particle cap, worker-side spawning over time, and scene-to-renderer source switching between emitter and initial-block initialization.

Issue #24 reshapes the app into a responsive workspace shell with a top bar, a canvas-first main viewport, and a collapsible side panel for controls.

Issue #25 adds a simulation control bar wired to the worker client, including play, pause, step, reset, speed scaling, and keyboard shortcuts for play/pause and reset.

Issue #26 expands the side panel into a scene editor with container controls, live obstacle add/remove/edit controls, and emitter toggles plus parameter editing.

Issue #27 adds a safe simulation-parameter panel for gravity, viscosity, rest density, and particle budget controls, with clamped ranges to reduce unstable configurations.

Issue #28 adds a live HUD overlay to the Three.js viewport for render FPS, simulation step rate, active particle count, and elapsed simulation time.

Issue #29 adds visualization-mode toggles for speed, density, and pressure, with worker-supplied scalar buffers driving per-instance particle coloring in the viewport.

Issue #30 adds validated scene JSON serialization plus a localStorage-backed preset manager for named create/list/load/delete workflows.

Issue #31 adds a preset-manager UI for saving, loading, deleting, importing, and exporting scene JSON snapshots from the control rail.

Issue #32 adds PNG frame capture for the viewport canvas, with start/stop controls that bundle captured frames into a downloadable zip archive.

Issue #33 adds WebM viewport recording through `canvas.captureStream()` and `MediaRecorder`, with a configurable export framerate in the control bar.

Issue #36 adds three built-in starter scenes, a default first-visit scene load, and lightweight onboarding so the workspace opens with a ready-to-run setup instead of an empty editor state.

Issue #37 adds shared simulation safety rails for parameter clamping, timestep caps, non-finite particle-state detection, and user-visible worker error toasts in the workspace shell.
