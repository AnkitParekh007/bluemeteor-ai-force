# Playwright test runner

## Architecture

**Testo / tools** → **ToolExecutorService** → **PlaywrightTestRunnerService** → isolated **Chromium** launch → template functions in `server/src/testing/templates/` → results persisted (`PlaywrightTestRun` / `PlaywrightTestCase`) → optional **markdown report** and **screenshot** URLs under `/test-assets/...`.

## Template tests

Allowlisted keys from `PLAYWRIGHT_ALLOWED_TEST_TEMPLATES`:

- `login_smoke` — login form or post-auth check.
- `dashboard_smoke` — `/dashboard` reachable.
- `supplier_upload_smoke` — configurable path (defaults toward dashboard).

## Generated spec safety

- **`playwright_generate_spec`** creates an artifact only.
- **`playwright_validate_spec`** runs a **static sanitizer** (blocks `child_process`, `fs.`, `require`, `eval`, `page.evaluate`, etc.).
- **`playwright_run_validated_spec`** validates and **stores** the spec; **arbitrary generated TypeScript is not executed** via Playwright CLI in this phase—use **template runs** for executed smoke.

## Artifacts

- `test_report` markdown from template runs.
- `playwright_spec` from generate tool.
- Screenshot links point at `/test-assets/screenshots/...` (not filesystem paths).

## Approval gates

- Config: `REQUIRE_APPROVAL_FOR_REAL_TEST_RUN`, `REQUIRE_APPROVAL_FOR_AUTH_BROWSER`.
- **`playwright_run_validated_spec`** is **high** risk and always approval-gated in policy.

## Troubleshooting

- Install browsers: in `server/`, `npm run playwright:install`.
- Enable **`ENABLE_REAL_PLAYWRIGHT_TESTS=true`** for real template execution; otherwise runs persist as **blocked** with an explanatory message.
