-- CreateTable
CREATE TABLE "mcp_servers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transport" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "readOnly" BOOLEAN NOT NULL,
    "configJson" TEXT,
    "startedAt" DATETIME,
    "stoppedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mcp_tools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchemaJson" TEXT,
    "riskLevel" TEXT NOT NULL,
    "readOnly" BOOLEAN NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mcp_tools_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "mcp_servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mcp_tool_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "runId" TEXT,
    "sessionId" TEXT,
    "agentSlug" TEXT,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "isError" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "mcp_servers_enabled_idx" ON "mcp_servers"("enabled");

-- CreateIndex
CREATE INDEX "mcp_servers_status_idx" ON "mcp_servers"("status");

-- CreateIndex
CREATE INDEX "mcp_tools_serverId_idx" ON "mcp_tools"("serverId");

-- CreateIndex
CREATE INDEX "mcp_tools_name_idx" ON "mcp_tools"("name");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_serverId_idx" ON "mcp_tool_calls"("serverId");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_runId_idx" ON "mcp_tool_calls"("runId");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_sessionId_idx" ON "mcp_tool_calls"("sessionId");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_agentSlug_idx" ON "mcp_tool_calls"("agentSlug");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_toolName_idx" ON "mcp_tool_calls"("toolName");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_createdAt_idx" ON "mcp_tool_calls"("createdAt");
