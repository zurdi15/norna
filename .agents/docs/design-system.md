# Design system (Norna frontend)

The frontend is being rebuilt from scratch on the `norna-redesign` branch (plan: `plans/norna-redesign.md`).
The visual direction was fixed in phase 0: IBM Plex Sans + Plex Mono, Fjord accent in its "steel" tone,
runic radii (3/5/8/14px), and the Norns' captions (Urðr / Verðandi / Skuld) over past / present / future.

## Tokens

- `frontend/src/styles/tokens.css` is the only source of color, type, radius, elevation and motion.
  It is a Tailwind `@theme` that wipes the default palette, so a utility can only use a Norna token.
- Colors resolve per theme with `light-dark()`. `color-scheme` follows the OS until `useColorScheme()`
  stamps `data-theme` on `<html>`. Never add a dark override by hand; change the token.
- Utilities: `bg-canvas`, `bg-surface`, `border-line`, `text-ink`, `text-ink-muted`, `text-ink-faint`,
  `bg-accent text-on-accent`, `text-danger`… Custom utilities in `styles/main.css`: `caption`
  (mono uppercase label), `thread` (1px line filling a row), `pt-safe`/`pb-safe`/`ps-safe`/`pe-safe`.
- Text sizes: `3xs`(10) `2xs`(11) `xs`(12) `sm`(13) `base`(14, pointer body) `md`(15, touch body)
  `lg`(16, inputs on touch) `xl`(18) `2xl`(22) `3xl`(28).
- Browser chrome (`theme-color`, PWA manifest) can't read tokens. Keep the hex copies in
  `index.html`, `vite.config.ts` and `composables/useColorScheme.ts` in sync with `--color-canvas`.

## Components

- `src/ui/`: domain-free primitives on Reka UI, prefixed `Ui*`. Classes are merged with `cn()`
  (`src/ui/cn.ts`), which knows our custom scales. Variants use `cva`.
- `src/features/<area>/`: domain components. `src/pages/`: thin route components.
- Icons: Lucide via `UiIcon`. An icon-only `<button>`/`UiButton` needs an accessible name
  (`eslint-rules/icon-button-accessible-name.js`); `UiIconButton` requires a `label` prop.
- Pickers and menus open as a popover or dropdown from `md` up and as a bottom sheet or action
  sheet below it, through one adaptive overlay. Don't build two versions of a picker.

## Lint guardrails

- ESLint (`better-tailwindcss`) rejects unknown classes, conflicting classes and arbitrary colors
  (`bg-[#…]`, `text-[oklch(…)]`). Stylelint runs on plain CSS and enforces logical properties.

## Contracts the rewrite must keep

- URLs the backend or emails emit: `/tasks/:id`, `/projects/:id`, `/teams/:id`,
  `/user/settings/{general,api-tokens,email-update}`, `/?userEmailConfirm=`, `/?userPasswordReset=`,
  `/?accountDeletionConfirm=`, `/get-password-reset`, `/migrate/*`, `/user/export/download`,
  `/share/:share/auth`, `/auth/openid/:provider`, `/oauth/authorize`. Route names stay stable too.
- `index.html`: `<div id="app"></div>` (pkg/routes/static.go injects config after it), the
  `window.API_URL = '/api/v1'` line with single quotes, and a bare `<head>` (CI injects `window.TESTING`).
- Electron: `?mode=quick-add` and the `window.quickEntry` / `window.vikunjaDesktop` bridges.
- The service worker's `notificationclick` handler and the `package.json` scripts `build`,
  `build:dev` and `preview:dev` (used by magefile.go and release.yml).

## Upstream

Only the backend follows upstream. `mage dev:sync-upstream` merges `upstream/main`, restores
`frontend/` from HEAD and regenerates the API client. Review the list of discarded upstream frontend
changes it prints; `frontend/embed.go` and the e2e harness may still need a manual port.
