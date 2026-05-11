# Alex-Hou-2024-test-25

Interactive browser-based fluid playground built with Vite, React, TypeScript, Three.js, Zustand, and Web Workers.

## Stack

- Vite + React 19 + TypeScript
- Three.js for viewport rendering
- Zustand for editor and viewport state
- Web Workers for simulation stepping
- Tailwind CSS + shadcn/ui for the shell
- Vitest + Playwright for automated coverage

## Requirements

- Node.js 20+ recommended
- npm 10+ recommended

## Setup

```bash
npm install
cp .env.example .env.local
```

The app reads frontend-only defaults from Vite environment variables:

- `VITE_DEFAULT_PARTICLE_COUNT`
- `VITE_DEFAULT_EMITTER_RATE`
- `VITE_DEFAULT_SHOW_HELPERS`

## Development

Run the editor locally:

```bash
npm run dev
```

The dev server listens on `0.0.0.0:8080`.

## Commands

```bash
npm run dev
npm run lint
npm run format
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run preview
npm run serve:dist
```

- `npm run preview` uses Vite's preview server.
- `npm run serve:dist` uses a plain Node static server from `scripts/serve-dist.mjs`.

## Workspace Guide

The app opens into a canvas-first workspace shell with a collapsible control rail.

Key features:

- Built-in starter scenes: `Dam break`, `Fountain`, `Drop into pool`
- Simulation controls: play, pause, step, reset, speed
- Export tools: PNG frame capture and WebM recording
- Scene editing: container size, obstacles, fluid source, presets
- SSFR fluid rendering with debug views for depth, thickness, and normals
- Visualization modes: color by speed, density, or pressure
- HUD stats: render FPS, simulation step rate, particle count, sim time

Keyboard shortcuts:

- `Space`: play / pause
- `R`: reset simulation

## SSFR Water Surface

The viewport supports two render paths:

- `SSFR fluid surface`: renders particles through the screen-space fluid pipeline
- `Instanced particle spheres`: renders the legacy particle impostor view

The SSFR path currently includes:

- particle depth and thickness passes
- bilateral depth smoothing
- normal reconstruction
- water compositing with absorption and Fresnel reflection
- debug view switching between `final`, `depth`, `thickness`, and `normals`

Fluid appearance controls in the side panel:

- water color
- absorption strength
- thickness scale
- Fresnel power
- blur radius
- blur iterations

Screenshot placeholder:

- Add an updated SSFR viewport screenshot here once final art capture is available.

## Starter Scenes

The built-in scenes are tuned for a strong first render:

- `Dam break` is the default first-visit scene and opens on a camera angle that immediately shows a dense collapsing fluid wall.
- `Fountain` caps its emitter below the hard safety maximum so the plume reads clearly without overwhelming the viewport.
- `Drop into pool` starts with a larger suspended block and a steeper camera angle so the initial impact reads as a visible water volume instead of sparse particles.

## Safety Rails

The current build clamps unsafe simulation inputs before they reach the worker:

- particle count caps
- viscosity and timestep clamping
- scene import sanitization
- non-finite particle-state detection
- user-visible worker error toasts

## Testing

Unit and browser coverage:

```bash
npm run test:unit
npm run test:e2e
```

The Playwright suite covers:

- happy-path simulation controls
- preset save/load flow
- WebM export download flow
- SSFR integration coverage across final/depth/thickness/normal render outputs

## Production Build

Create the static bundle:

```bash
npm run build
```

Output is written to `dist/`.

## Verifying `dist/` From A Plain Static Server

Build first, then serve `dist/` without Vite:

```bash
npm run build
npm run serve:dist
```

The included server:

- serves `dist/index.html`
- serves hashed assets from `dist/assets/`
- falls back to `index.html` for client-side routes

This is the same deployment shape expected by static hosts.

## Deployment Notes

Deploy the contents of `dist/` to any static host, including:

- Netlify
- Cloudflare Pages
- GitHub Pages
- S3 + CloudFront
- any Nginx / Caddy static site setup

Recommended deployment behavior:

- publish the `dist/` directory only
- serve `index.html` for unknown application routes
- cache hashed files in `dist/assets/` aggressively
- keep `index.html` on a shorter cache policy so new builds roll out cleanly

## Project Layout

- `src/sim`: SPH kernels, particle buffers, integration, safety rails, top-level simulation
- `src/render`: Three.js viewport, particle rendering, export helpers
- `src/store`: Zustand stores, built-in scenes, preset serialization
- `src/ui`: workspace shell and viewport wrapper
- `src/workers`: worker protocol, host, and client wrapper
- `e2e`: Playwright browser coverage
- `scripts/serve-dist.mjs`: plain static server for built output verification
