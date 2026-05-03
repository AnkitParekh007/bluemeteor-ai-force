# Agent runtime architecture

## Overview

The Angular workspace sends messages to `AgentOrchestratorService`, which plans tools, executes them through `ToolExecutorService`, then calls the configured LLM provider. Results stream over SSE as `AgentRuntimeEvent` records.

## Agent intelligence layer

Before the provider call, the orchestrator:

1. Loads the **active system prompt template** from `AgentPromptRegistryService` (if present) and renders variables (`agentName`, `agentRole`, `mode`, `userMessage`, `ragContext`, `toolResults`, etc.).
2. Falls back to the static `systemPrompt` from `INTERNAL_AGENT_CONFIGS` if no template is active or required variables are missing.
3. Augments with RAG via `RagContextBuilderService` as before.

Tool planning:

1. Calls `AgentWorkflowTemplateService.matchWorkflowForPrompt`.
2. If a workflow matches, converts `run_tool` / `generate_artifact` / `search_context` / `test_action` steps into planned tool calls (respecting evaluation blocklists when `context.evaluation` is set).
3. Otherwise uses the existing keyword-based planner.

Skill packs extend tool allowance through `ToolPermissionService.canUseTool` using an in-memory union of active pack tool ids.

## Evaluation flow

`AgentEvaluationService` creates a session, sets `context: { evaluation: true }`, and reuses the normal orchestrator path with stricter tool filtering and `forceApproved` tool execution to avoid blocking on approval UI during unattended runs.

See [agent-intelligence-architecture.md](./agent-intelligence-architecture.md) for registry details.
