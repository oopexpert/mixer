# AGENTS.md — frontend

## Project

Vite + React 19 app (`mixer-frontend`, JavaScript, no TypeScript). UI for the drink mixing machine: user-facing dispense flow plus an admin panel (priming, port control, recording, tokens). HTTP via axios.

Part of the `mixer` monorepo — see root `AGENTS.md` for the Maven build and environment setup.

## Scripts (`package.json`)

```powershell
npm run dev          # Vite dev server (proxies /admin + /user to the backend on :8080)
npm run build        # vite build → dist/ (served by the backend from classes/static)
npm run preview      # preview the production build
npm run test         # vitest run (single pass, used by the Maven build)
npm run test:watch   # vitest watch mode for development
npm run lint         # eslint .
```

## Dev server proxy (`vite.config.js`)

`/admin` and `/user` are proxied to `http://localhost:8080` (`changeOrigin: true`), so `npm run dev` works against a locally running backend with no CORS setup.

## Components (`src/`)

- `App.jsx` / `main.jsx` / `MixerUI.jsx` — app shell and entry point.
- `MixerUI_x.jsx` — exists alongside `MixerUI.jsx`; purpose unclear (possibly a stale/experimental variant). Check before touching.
- `RecipeList.jsx`, `DispenseControl.jsx`, `StatusPanel.jsx` — user-facing dispense flow.
- `AdminPanel.jsx` — admin shell (composes the modules below; polls status/tokens depending on machine state).
- `AdminActions.jsx`, `AdminSetup.jsx`, `AdminStatusDisplay.jsx` (includes `getStatusText`/`getStatusColor` helpers), `HardwareControl.jsx`, `TokenManagement.jsx`, `RecordingMode.jsx` — admin modules.
- `ManualIngredientDialog.jsx`, `DispenseErrorDialog.jsx`, `RecipeEditWizard.jsx` — dialogs/wizard.
- `src/assets/` — static assets (`react.svg`); `public/vite.svg` — favicon.

## Conventions

- Unknown machine states render as `` `Unbekannter Status: ${state}` `` (see `getStatusText` in `AdminStatusDisplay.jsx`) — covered by `AdminStatusDisplay.test.jsx`.
- Error toasts surface `error.response.data.message` from the backend where present (e.g. reload-while-busy returns 400 with `{ state, message }`).

## Tests

- Vitest with jsdom, `globals: true`, setup file `src/test/setup.js` (imports `@testing-library/jest-dom`).
- Test files are co-located: `*.test.jsx` next to the component (axios is mocked per test file).
- Run standalone: `npm test` from `frontend/`. Run via Maven: `.\mvnw.cmd -pl frontend -am test` from root; skippable with `-DskipTests`.

## Lint

Flat config (`eslint.config.js`): `eslint:recommended` + `react-hooks` + `react-refresh` (Vite preset), browser globals, `no-unused-vars` with `^[A-Z_]` ignore pattern. `dist` is globally ignored.

## Maven wiring (`frontend/pom.xml`)

`frontend-maven-plugin` (Node v22 + npm 11, downloaded automatically) runs `install-node-and-npm` → `npm install` → `npm run build` in phase `generate-resources`, and `npm test` in phase `test`. Build output `frontend/dist/` is consumed by the backend module and never committed.
