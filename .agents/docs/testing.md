# Testing

## Backend

- Always via mage: `mage test:web`, `mage test:feature`, `mage test:filter <go-test-filter>`. Plain `go test` does not work.
- `mage test:filter` runs most packages with `-short` but re-runs `pkg/webtests` without it, so a filter naming a web test actually executes it.
- Save output to a file and read the file: `mage test:filter Foo 2>&1 | tee /tmp/out.log`. Tests are expensive; never re-run one just to grep differently.
- Fixtures live in `pkg/db/fixtures/`. Use them instead of inventing data.
- Every permission path needs a positive and a negative test: the allowed user succeeds, an unrelated user is denied.

## Frontend

- E2E: invoke the `run-e2e-tests` skill (`mage test:e2e`). Never run `pnpm test:e2e` directly.
- Prefer e2e tests over component tests. User-visible behaviour (a created item appears, an edit sticks after reload, a delete removes the row) and the "How to verify" steps of a PR belong in `frontend/tests/e2e/`. Extend an existing spec when one covers the page; add one when none does.
- E2E tests assert stored state, not just a toast: reload the page, and check the API through the `apiContext`/`userToken` fixtures where the UI could lie.
- Component tests are only for what e2e can't exercise reliably: request races, stale responses after navigation, identity changes mid-request, and similar timing cases. Mocked component tests pass while the real page is broken, so they don't replace an e2e test for the same behaviour.
- Unit tests: `pnpm vitest run <file>` in `frontend/`. Mock the generated client with `vi.mock('@/client/generated', () => sdk)` and `@/message` when the code toasts.
- When a component test is justified and reads server data, mount it against a real `QueryClient` seeded through the key factories, and mock only the generated client. Don't mock the composable that owns the behaviour under test; a mocked read hid a table that never updated after mutations. If a mutation invalidates a query, the client mock must answer the refetch with data matching the seeded state.
- A regression test must fail against the unfixed code. Check that before landing the fix.
- A test that can't fail is a defect. Examples: asserting that an unseeded cache is `toBeUndefined()`, checking for hidden controls on the viewer's own row (it never shows them), asserting two key literals differ, or calling the fix itself (`observer.reset()`) instead of going through the component.
- Typecheck with `pnpm typecheck` in `frontend/` and read the log. It reports no errors, and must stay that way. Plain `vue-tsc --build` without `--force` can skip the build and print nothing, which looks like zero errors. Outside components translate with `translate()` from `@/i18n`; `i18n.global.t` with named parameters hits TS2589.
- The project is `composite`, so exported functions need nameable types: an object spread over a TanStack options type (`{...mutationOptions(...), gcTime: 0}`) fails with TS2883. Pass the option instead, or annotate the return type.
- Accessibility: `tests/e2e/a11y/axe.spec.ts` runs axe on the main pages and fails on serious or critical violations. Add a page there when you add one.
- Phones: specs tagged `@mobile` run on the `mobile` Playwright project (Pixel 7). Long presses need real touch events through CDP (see `tests/e2e/mobile/phone.spec.ts`).
