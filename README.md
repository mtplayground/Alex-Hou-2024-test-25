# Alex-Hou-2024-test-25

Browser-based fluid playground scaffolded with Vite, React, and TypeScript.

## Stack

- Vite
- React
- TypeScript
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

## Directory layout

- `src/sim`: simulation modules
- `src/render`: rendering modules
- `src/ui`: UI composition and presentation
- `src/store`: app state modules
- `src/workers`: worker entrypoints and message plumbing

Issue #2 configures linting, formatting, and strict TypeScript rules on top of the initial scaffold.
