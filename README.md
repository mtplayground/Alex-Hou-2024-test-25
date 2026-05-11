# Alex-Hou-2024-test-25

Browser-based fluid playground scaffolded with Vite, React, and TypeScript.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
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
```

## UI foundation

- `tailwind.config.js`: Tailwind theme and content scanning
- `postcss.config.js`: Tailwind + Autoprefixer pipeline
- `components.json`: shadcn/ui project configuration
- `src/components/ui`: shared UI primitives
- `src/lib/utils.ts`: shared `cn` helper for class composition

## Directory layout

- `src/sim`: simulation modules
- `src/render`: rendering modules
- `src/ui`: UI composition and presentation
- `src/store`: app state modules
- `src/workers`: worker entrypoints and message plumbing

Issue #3 adds Tailwind CSS, initializes the `shadcn/ui` file layout, and introduces shared Button, Slider, Input, and Card components.
