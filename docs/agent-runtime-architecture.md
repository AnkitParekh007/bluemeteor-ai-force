# Agent runtime architecture

## Authenticated browser flow

1. User or Testo creates a **browser profile** (target URL allowlisted).
2. **Auth capture** opens a fresh Playwright context on the login URL.
3. After login, **storage state** is written to disk; profile status becomes **ready**.
4. **`browser_open_authenticated`** recreates a context with `storageState` and navigates to the requested URL.
5. Runtime events (`browser_profile_ready`, `browser_authenticated_session_opened`, etc.) update the workspace UI **without** exposing secrets.

## Playwright test execution flow

1. Planner may suggest **`playwright_generate_from_template`** / **`playwright_run_template`** in Act mode.
2. **ToolExecutorService** enforces RBAC, mode, and approval.
3. **PlaywrightTestRunnerService** runs allowlisted templates when `ENABLE_REAL_PLAYWRIGHT_TESTS=true`, or records a **blocked** run when disabled.
4. Results and **safe asset URLs** are attached to artifacts and events (`playwright_run_completed`, etc.).

## Testo QA workflow

Testo combines **connectors** (Jira/repo/docs), **browser profiles**, **template smoke runs**, and **spec artifacts**. Fronto reuses **profiles** and **DOM/screenshot** tools for authenticated UI review.
