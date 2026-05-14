# Agent Orchestration

The orchestration layer is where chat, tool planning, approvals, provider routing, and runtime events meet.

## What It Covers

- agent session management
- runtime event emission
- approval checkpoints
- artifact creation
- browser and tool integrations
- provider routing and fallback policy

## Frontend Relationship

The Angular workspace does not only show a chat box. It renders:

- session context
- tool-call visibility
- approvals
- artifacts
- browser worker output
- test results

That matters because enterprise agent UX has to make work visible, not just conversational.

## Prototype Note

Some flows are fully mock-backed in the frontend. The orchestration design is still useful because it shows where production-grade services would plug in.
