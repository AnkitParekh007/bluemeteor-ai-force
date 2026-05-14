# RAG And Tool Layer

This repo treats retrieval and tool execution as governed layers, not hidden implementation details.

## RAG Layer

- RAG modules and services exist on the server
- the architecture is ready for knowledge ingestion, chunking, context building, and search
- richer citation rendering is still an area for improvement in the UI

## Tool Layer

- tool registry and permission services define what can be used
- approval services gate risky actions
- connectors and MCP-style services expand the reachable internal surface area
- browser and Playwright worker services support controlled execution paths

## Why This Matters

Internal copilots and agent workspaces need:

- inspectable tool execution
- clear approvals
- governed access to internal systems
- visible distinctions between read, act, and recover states
