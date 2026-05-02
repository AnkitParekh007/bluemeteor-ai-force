-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "preview" TEXT
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "metadataJson" TEXT,
    CONSTRAINT "agent_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "finalAnswer" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "agent_runs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_run_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "error" TEXT,
    "metadataJson" TEXT,
    CONSTRAINT "agent_run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_tool_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "agent_tool_calls_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "agentSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME,
    "metadataJson" TEXT,
    CONSTRAINT "agent_artifacts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_runtime_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "sessionId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" DATETIME NOT NULL,
    "payloadJson" TEXT,
    CONSTRAINT "agent_runtime_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "agent_approvals_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "sessionId" TEXT,
    "runId" TEXT,
    "agentSlug" TEXT,
    "action" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rag_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUri" TEXT,
    "content" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rag_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "embeddingJson" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "rag_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "rag_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "agent_sessions_agentSlug_idx" ON "agent_sessions"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_sessions_createdAt_idx" ON "agent_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "agent_messages_sessionId_idx" ON "agent_messages"("sessionId");

-- CreateIndex
CREATE INDEX "agent_runs_sessionId_idx" ON "agent_runs"("sessionId");

-- CreateIndex
CREATE INDEX "agent_runs_agentSlug_idx" ON "agent_runs"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_runs_createdAt_idx" ON "agent_runs"("createdAt");

-- CreateIndex
CREATE INDEX "agent_run_steps_runId_idx" ON "agent_run_steps"("runId");

-- CreateIndex
CREATE INDEX "agent_tool_calls_runId_idx" ON "agent_tool_calls"("runId");

-- CreateIndex
CREATE INDEX "agent_artifacts_sessionId_idx" ON "agent_artifacts"("sessionId");

-- CreateIndex
CREATE INDEX "agent_artifacts_runId_idx" ON "agent_artifacts"("runId");

-- CreateIndex
CREATE INDEX "agent_artifacts_agentSlug_idx" ON "agent_artifacts"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_runtime_events_sessionId_idx" ON "agent_runtime_events"("sessionId");

-- CreateIndex
CREATE INDEX "agent_runtime_events_runId_idx" ON "agent_runtime_events"("runId");

-- CreateIndex
CREATE INDEX "agent_runtime_events_type_idx" ON "agent_runtime_events"("type");

-- CreateIndex
CREATE INDEX "agent_runtime_events_timestamp_idx" ON "agent_runtime_events"("timestamp");

-- CreateIndex
CREATE INDEX "agent_approvals_runId_idx" ON "agent_approvals"("runId");

-- CreateIndex
CREATE INDEX "agent_audit_logs_sessionId_idx" ON "agent_audit_logs"("sessionId");

-- CreateIndex
CREATE INDEX "agent_audit_logs_agentSlug_idx" ON "agent_audit_logs"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_audit_logs_createdAt_idx" ON "agent_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "rag_documents_sourceType_idx" ON "rag_documents"("sourceType");

-- CreateIndex
CREATE INDEX "rag_documents_createdAt_idx" ON "rag_documents"("createdAt");

-- CreateIndex
CREATE INDEX "rag_chunks_documentId_idx" ON "rag_chunks"("documentId");
