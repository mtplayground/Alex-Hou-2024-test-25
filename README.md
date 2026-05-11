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
