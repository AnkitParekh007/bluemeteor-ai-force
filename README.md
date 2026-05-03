<<<<<<< HEAD
# BluemeteorAiForce

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.9.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
=======
# Bluemeteor AI Force

Internal **Angular 21** agent workspace + **NestJS** orchestrator (Prisma, SSE, RAG, tools, connectors, browser/test workers). See `server/README.md` for API detail.

## Docker pilot (PostgreSQL + nginx)

1. Copy `.env.docker.example` → `.env` (repo root) and set secrets.
2. `docker compose up --build`
3. App: `http://localhost:8080` — API proxied at `/api`.

Docs: [`docs/deployment-guide.md`](docs/deployment-guide.md), [`docs/database-operations.md`](docs/database-operations.md), [`docs/observability.md`](docs/observability.md).

## Admin Console

Leads and admins can operate the platform from **`/admin`** (overview, agents, users, tools, connectors, MCP, prompts, skill packs, workflows, evaluations, approvals, audit, ops, readiness). The console is permission-gated and does not show secrets or raw credentials. See [`docs/admin-console-guide.md`](docs/admin-console-guide.md) and [`docs/internal-pilot-readiness.md`](docs/internal-pilot-readiness.md).

## Internal pilot hub

Controlled internal pilot UX lives at **`/pilot`** (all authenticated users): overview, onboarding, agent guides, demo scripts, feedback form, known limitations, and support/escalation templates.

- **Metrics:** `/pilot/metrics` — `system.debug.view` or `system.admin`.
- **Readiness gate & report:** `/pilot/readiness` — `system.debug.view`, `agents.readiness.view`, or `system.admin`.
- **Feedback API:** `POST /pilot/feedback` (authenticated); listing `GET /pilot/feedback` is admin/debug only.

Docs: [`docs/internal-pilot-launch-plan.md`](docs/internal-pilot-launch-plan.md), [`docs/pilot-user-guide.md`](docs/pilot-user-guide.md), [`docs/pilot-admin-guide.md`](docs/pilot-admin-guide.md), [`docs/pilot-demo-script.md`](docs/pilot-demo-script.md), [`docs/pilot-sample-prompts.md`](docs/pilot-sample-prompts.md), [`docs/pilot-success-metrics.md`](docs/pilot-success-metrics.md).

## Local development

- Frontend: `ng serve` → `http://localhost:4200`
- Backend: `cd server && npm run start:dev` — default SQLite `file:./dev.db`

## Development server (Angular CLI)

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
>>>>>>> master
