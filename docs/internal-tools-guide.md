# Internal read-only tools

Bluemeteor AI Force exposes a **read-only internal tool hub** for agents. Tools scan the local monorepo, documentation, mock tickets, API catalog JSON, schema markdown, and CI/CD allowlisted files.

## What is allowed

- Repository text files under `REPOSITORY_ALLOWED_PATHS`
- Documentation under `docs/` plus root `README.md` files
- Mock tickets from `docs/mock-tickets.json` (future: Jira / ServiceNow)
- API definitions from `docs/api-catalog.json`
- Schema documentation from `docs/database-schema.md` (no live DB)
- CI/CD files listed in `CICD_ALLOWED_FILES`
- MCP server definitions from `server/mcp.config.json` (optional; execution disabled by default)

## What is blocked

- `.env`, private keys, `node_modules`, `dist`, `.git`
- Path traversal and paths outside allowlists
- Files larger than `MAX_TOOL_FILE_READ_BYTES`
- Non-text extensions outside the safe list
- SQL execution, shell, deployments, and database mutations

## Agents

See `server/src/agents/data/internal-agent-configs.ts` for which tools each persona may call.

## Regenerating / testing

Use `GET /internal-tools/health` (requires `tools.view`) or the **Internal tools debug** page in the Angular app.
