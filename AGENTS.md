# AGENT Instructions

Norna: a self-hosted app for tasks and projects. Go API in `pkg/` (follows an upstream backend, synced with `mage dev:sync-upstream`), Vue 3 + TypeScript frontend in `frontend/` (pnpm) with its own design system. The product is called Norna everywhere: no upstream name in code, text, config or docs (`mage check:branding`); only the Go module path, the AGPL license headers and `LICENSE` keep it.

## Commands

Go tasks run through `mage` (`mage -l`). Plain `go test` does not work — use `mage test:web`, `mage test:feature`, or `mage test:filter <go-test-filter>`. Save test output to a file (`2>&1 | tee /tmp/out.log`) and read the file; never re-run a test just to grep it differently.

Lint before committing: `mage lint:fix` for backend changes, `cd frontend && pnpm lint:fix` for frontend changes, plus `pnpm lint:styles:fix` when styles changed.

## Always

- Every new API route goes on `/api/v2`. `/api/v1` is frozen (bug fixes and ports to v2 only). See [API design](.agents/docs/api.md).
- The frontend talks to the API only through the generated client and types in `frontend/src/client/generated`, via the query layer in `frontend/src/client/queries/` (see [API design](.agents/docs/api.md)).
- Never hand-edit generated files: `pkg/swagger/` (`mage generate:swagger-docs` after changing v1 annotations) and `config.yml.sample` (from `config-raw.json`).
- Norna enables every feature `pkg/license/` gates; don't change that without asking. See [License system](.agents/docs/license.md).
- Conventional Commits.

## Skills

Invoke with the `Skill` tool before writing code in these areas:

- `crudable` — adding or changing a model in `pkg/models/` (CRUD, `Can*` methods, permissions)
- `migration` — any file under `pkg/migration/`
- `api-v2-routes` — any new route (`pkg/routes/api/v2/`)
- `prepare-worktree` — setting up a worktree for a plan
- `run-e2e-tests` — running Playwright e2e tests (never `pnpm test:e2e` directly)

Frontend UI work follows the [design system](.agents/docs/design-system.md): tokens only, `src/ui/` primitives, mobile first.

## Details

- [API design](.agents/docs/api.md)
- [Design system](.agents/docs/design-system.md)
- [Testing](.agents/docs/testing.md)
- [Code style](.agents/docs/code-style.md)
- [Translations](.agents/docs/translations.md)
- [Git, plans, worktrees](.agents/docs/git-workflow.md)
- [Dev commands and configuration](.agents/docs/dev-commands.md)
- [License system](.agents/docs/license.md)
