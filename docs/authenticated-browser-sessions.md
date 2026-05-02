# Authenticated browser sessions

## Concept

A **browser profile** stores Playwright **storage state** (cookies and local storage) for a **single test target** under your control. Profiles carry **metadata** (name, environment, status) in the API; **storage state files never leave the server** and are **not exposed** to the Angular client.

## Manual login capture

1. Enable `ENABLE_AUTHENTICATED_BROWSER_SESSIONS=true`.
2. From Testo (Act mode) or the REST API, start **`browser_auth_capture_start`** / `POST /browser/auth-captures/start`.
3. The worker opens `TEST_TARGET_LOGIN_URL` in a Playwright context.
4. The user completes login in the **browser preview** (not by pasting passwords into chat).
5. Call **`browser_auth_capture_complete`** with the `captureId` to persist `context.storageState()` into `BROWSER_AUTH_STATE_DIR`.

## Demo login (local only)

When `ENABLE_DEMO_BROWSER_LOGIN=true` and the target is **local** (`TEST_TARGET_ENVIRONMENT` not production, localhost-style host), the tool **`browser_create_demo_auth_profile`** may fill the demo fields using `DEMO_BROWSER_USERNAME` / `DEMO_BROWSER_PASSWORD`. **Never use demo credentials against non-local origins.** Server code must **never log** the demo password.

## What is stored

- JSON storage state files under `BROWSER_AUTH_STATE_DIR` (server filesystem only).
- Rows in `BrowserProfile` / `BrowserAuthCapture` for audit and UI status.

## What is never exposed

- Raw storage state, cookies, tokens, or passwords in API responses or runtime events.
- Auth state directory is **not** mounted as static files (only screenshots/videos/traces/reports under `/test-assets/...`).

## Enabling locally

See `server/.env.example`: set authenticated sessions, test target URLs, and optional demo login. Run `npx prisma db push` (or migrate) after pulling schema changes.

## Production

With `TEST_TARGET_ENVIRONMENT=production` and `ALLOW_TESTS_AGAINST_PRODUCTION=false`, **template test execution is blocked** at the config layer.
