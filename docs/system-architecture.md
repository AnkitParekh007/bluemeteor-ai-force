# System Architecture

Org AI Force is split into four major concerns:

1. Angular workspace surfaces for agents, admin, pilot, readiness, and operations
2. NestJS orchestration and governance APIs
3. Tool, connector, RAG, and browser-worker capability layers
4. Pilot and observability flows for controlled internal rollout

## Frontend

- Angular 21
- route-based workspace for agents, admin, pilot, and debug views
- guarded access through auth, permission, and agent-route checks
- mock-capable services for offline or demo-safe flows

## Backend

- NestJS modules for auth, agents, tools, connectors, pilot, observability, browser, and RAG
- Prisma-backed persistence paths for SQLite and PostgreSQL
- orchestrator and approval services behind API boundaries

## Runtime Shape

- user interacts with workspace UI
- Angular services manage session state and API interaction
- NestJS orchestrator coordinates tools, approvals, context, and provider calls
- observability and admin layers expose safe operational summaries

## Prototype Boundary

This architecture is meant to be inspectable and demonstrable. It is not presented as a finished production platform.
