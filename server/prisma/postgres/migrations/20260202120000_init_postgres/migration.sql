-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "preview" TEXT,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" TEXT,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "finalAnswer" TEXT,
    "error" TEXT,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_run_steps" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "agent_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tool_calls" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_artifacts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "agentSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "metadataJson" TEXT,

    CONSTRAINT "agent_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runtime_events" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "sessionId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "payloadJson" TEXT,

    CONSTRAINT "agent_runtime_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_approvals" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "requestedByUserId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedByEmail" TEXT,

    CONSTRAINT "agent_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "sessionId" TEXT,
    "runId" TEXT,
    "agentSlug" TEXT,
    "action" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUri" TEXT,
    "content" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "embeddingJson" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "agentSlug" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "headless" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "browser_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_actions" (
    "id" TEXT NOT NULL,
    "browserSessionId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "selector" TEXT,
    "value" TEXT,
    "url" TEXT,
    "resultJson" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "browser_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_snapshots" (
    "id" TEXT NOT NULL,
    "browserSessionId" TEXT NOT NULL,
    "runId" TEXT,
    "url" TEXT,
    "title" TEXT,
    "screenshotPath" TEXT,
    "screenshotUrl" TEXT,
    "domSummary" TEXT,
    "textContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "error" TEXT,
    "approvalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transport" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "readOnly" BOOLEAN NOT NULL,
    "configJson" TEXT,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_tools" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchemaJson" TEXT,
    "riskLevel" TEXT NOT NULL,
    "readOnly" BOOLEAN NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_tool_calls" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "runId" TEXT,
    "sessionId" TEXT,
    "agentSlug" TEXT,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "isError" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "mcp_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_calls" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "inputJson" TEXT,
    "outputSummary" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "connector_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetBaseUrl" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "storageStatePath" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadataJson" TEXT,

    CONSTRAINT "browser_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_auth_captures" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "profileId" TEXT,
    "status" TEXT NOT NULL,
    "loginUrl" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "browser_auth_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playwright_specs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "agentSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateKey" TEXT,
    "specPath" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "metadataJson" TEXT,

    CONSTRAINT "playwright_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playwright_test_runs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "agentSlug" TEXT NOT NULL,
    "profileId" TEXT,
    "status" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "resultJson" TEXT,
    "reportPath" TEXT,
    "tracePath" TEXT,
    "videoPath" TEXT,
    "screenshotPath" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "playwright_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playwright_test_cases" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "error" TEXT,
    "screenshotPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playwright_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_prompt_templates" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variablesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "agent_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_skill_packs" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "toolIdsJson" TEXT NOT NULL,
    "promptTemplateIdsJson" TEXT,
    "workflowTemplateIdsJson" TEXT,
    "knowledgeSourcesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" TEXT,

    CONSTRAINT "agent_skill_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_workflow_templates" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "stepsJson" TEXT NOT NULL,
    "requiredToolsJson" TEXT,
    "outputArtifactTypesJson" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" TEXT,

    CONSTRAINT "agent_workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_evaluation_cases" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputPrompt" TEXT NOT NULL,
    "expectedBehaviorsJson" TEXT NOT NULL,
    "expectedArtifactsJson" TEXT,
    "expectedToolsJson" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" TEXT,

    CONSTRAINT "agent_evaluation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_evaluation_runs" (
    "id" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "skillPackId" TEXT,
    "status" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "passedCases" INTEGER NOT NULL,
    "failedCases" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "resultJson" TEXT,
    "error" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "agent_evaluation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_evaluation_case_results" (
    "id" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "evaluationCaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "inputPrompt" TEXT NOT NULL,
    "actualAnswer" TEXT,
    "expectedSummary" TEXT,
    "toolResultsJson" TEXT,
    "artifactResultsJson" TEXT,
    "issuesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_evaluation_case_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "department" TEXT,
    "jobTitle" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agent_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_agent_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "agent_runs_actorUserId_idx" ON "agent_runs"("actorUserId");

-- CreateIndex
CREATE INDEX "agent_runs_traceId_idx" ON "agent_runs"("traceId");

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
CREATE INDEX "agent_approvals_requestedByUserId_idx" ON "agent_approvals"("requestedByUserId");

-- CreateIndex
CREATE INDEX "agent_approvals_resolvedByUserId_idx" ON "agent_approvals"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "agent_audit_logs_sessionId_idx" ON "agent_audit_logs"("sessionId");

-- CreateIndex
CREATE INDEX "agent_audit_logs_agentSlug_idx" ON "agent_audit_logs"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_audit_logs_createdAt_idx" ON "agent_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "agent_audit_logs_actorUserId_idx" ON "agent_audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "rag_documents_sourceType_idx" ON "rag_documents"("sourceType");

-- CreateIndex
CREATE INDEX "rag_documents_createdAt_idx" ON "rag_documents"("createdAt");

-- CreateIndex
CREATE INDEX "rag_chunks_documentId_idx" ON "rag_chunks"("documentId");

-- CreateIndex
CREATE INDEX "browser_sessions_sessionId_idx" ON "browser_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "browser_sessions_runId_idx" ON "browser_sessions"("runId");

-- CreateIndex
CREATE INDEX "browser_sessions_status_idx" ON "browser_sessions"("status");

-- CreateIndex
CREATE INDEX "browser_sessions_createdAt_idx" ON "browser_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "browser_actions_browserSessionId_idx" ON "browser_actions"("browserSessionId");

-- CreateIndex
CREATE INDEX "browser_actions_runId_idx" ON "browser_actions"("runId");

-- CreateIndex
CREATE INDEX "browser_actions_status_idx" ON "browser_actions"("status");

-- CreateIndex
CREATE INDEX "browser_actions_createdAt_idx" ON "browser_actions"("createdAt");

-- CreateIndex
CREATE INDEX "browser_snapshots_browserSessionId_idx" ON "browser_snapshots"("browserSessionId");

-- CreateIndex
CREATE INDEX "browser_snapshots_runId_idx" ON "browser_snapshots"("runId");

-- CreateIndex
CREATE INDEX "browser_snapshots_createdAt_idx" ON "browser_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "tool_executions_runId_idx" ON "tool_executions"("runId");

-- CreateIndex
CREATE INDEX "tool_executions_sessionId_idx" ON "tool_executions"("sessionId");

-- CreateIndex
CREATE INDEX "tool_executions_toolId_idx" ON "tool_executions"("toolId");

-- CreateIndex
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

-- CreateIndex
CREATE INDEX "tool_executions_approvalId_idx" ON "tool_executions"("approvalId");

-- CreateIndex
CREATE INDEX "tool_executions_createdAt_idx" ON "tool_executions"("createdAt");

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

-- CreateIndex
CREATE INDEX "connector_calls_connectorId_idx" ON "connector_calls"("connectorId");

-- CreateIndex
CREATE INDEX "connector_calls_provider_idx" ON "connector_calls"("provider");

-- CreateIndex
CREATE INDEX "connector_calls_operation_idx" ON "connector_calls"("operation");

-- CreateIndex
CREATE INDEX "connector_calls_status_idx" ON "connector_calls"("status");

-- CreateIndex
CREATE INDEX "connector_calls_createdAt_idx" ON "connector_calls"("createdAt");

-- CreateIndex
CREATE INDEX "browser_profiles_status_idx" ON "browser_profiles"("status");

-- CreateIndex
CREATE INDEX "browser_profiles_environment_idx" ON "browser_profiles"("environment");

-- CreateIndex
CREATE INDEX "browser_profiles_createdAt_idx" ON "browser_profiles"("createdAt");

-- CreateIndex
CREATE INDEX "browser_auth_captures_sessionId_idx" ON "browser_auth_captures"("sessionId");

-- CreateIndex
CREATE INDEX "browser_auth_captures_runId_idx" ON "browser_auth_captures"("runId");

-- CreateIndex
CREATE INDEX "browser_auth_captures_profileId_idx" ON "browser_auth_captures"("profileId");

-- CreateIndex
CREATE INDEX "browser_auth_captures_status_idx" ON "browser_auth_captures"("status");

-- CreateIndex
CREATE INDEX "browser_auth_captures_startedAt_idx" ON "browser_auth_captures"("startedAt");

-- CreateIndex
CREATE INDEX "playwright_specs_sessionId_idx" ON "playwright_specs"("sessionId");

-- CreateIndex
CREATE INDEX "playwright_specs_runId_idx" ON "playwright_specs"("runId");

-- CreateIndex
CREATE INDEX "playwright_specs_agentSlug_idx" ON "playwright_specs"("agentSlug");

-- CreateIndex
CREATE INDEX "playwright_specs_status_idx" ON "playwright_specs"("status");

-- CreateIndex
CREATE INDEX "playwright_specs_createdAt_idx" ON "playwright_specs"("createdAt");

-- CreateIndex
CREATE INDEX "playwright_test_runs_sessionId_idx" ON "playwright_test_runs"("sessionId");

-- CreateIndex
CREATE INDEX "playwright_test_runs_runId_idx" ON "playwright_test_runs"("runId");

-- CreateIndex
CREATE INDEX "playwright_test_runs_agentSlug_idx" ON "playwright_test_runs"("agentSlug");

-- CreateIndex
CREATE INDEX "playwright_test_runs_profileId_idx" ON "playwright_test_runs"("profileId");

-- CreateIndex
CREATE INDEX "playwright_test_runs_status_idx" ON "playwright_test_runs"("status");

-- CreateIndex
CREATE INDEX "playwright_test_runs_startedAt_idx" ON "playwright_test_runs"("startedAt");

-- CreateIndex
CREATE INDEX "playwright_test_cases_testRunId_idx" ON "playwright_test_cases"("testRunId");

-- CreateIndex
CREATE INDEX "playwright_test_cases_status_idx" ON "playwright_test_cases"("status");

-- CreateIndex
CREATE INDEX "agent_prompt_templates_agentSlug_idx" ON "agent_prompt_templates"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_prompt_templates_status_idx" ON "agent_prompt_templates"("status");

-- CreateIndex
CREATE INDEX "agent_prompt_templates_version_idx" ON "agent_prompt_templates"("version");

-- CreateIndex
CREATE INDEX "agent_prompt_templates_createdAt_idx" ON "agent_prompt_templates"("createdAt");

-- CreateIndex
CREATE INDEX "agent_prompt_templates_agentSlug_type_status_idx" ON "agent_prompt_templates"("agentSlug", "type", "status");

-- CreateIndex
CREATE INDEX "agent_skill_packs_agentSlug_idx" ON "agent_skill_packs"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_skill_packs_key_idx" ON "agent_skill_packs"("key");

-- CreateIndex
CREATE INDEX "agent_skill_packs_status_idx" ON "agent_skill_packs"("status");

-- CreateIndex
CREATE INDEX "agent_skill_packs_createdAt_idx" ON "agent_skill_packs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_skill_packs_agentSlug_key_key" ON "agent_skill_packs"("agentSlug", "key");

-- CreateIndex
CREATE INDEX "agent_workflow_templates_agentSlug_idx" ON "agent_workflow_templates"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_workflow_templates_key_idx" ON "agent_workflow_templates"("key");

-- CreateIndex
CREATE INDEX "agent_workflow_templates_status_idx" ON "agent_workflow_templates"("status");

-- CreateIndex
CREATE INDEX "agent_workflow_templates_createdAt_idx" ON "agent_workflow_templates"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_workflow_templates_agentSlug_key_key" ON "agent_workflow_templates"("agentSlug", "key");

-- CreateIndex
CREATE INDEX "agent_evaluation_cases_agentSlug_idx" ON "agent_evaluation_cases"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_evaluation_cases_key_idx" ON "agent_evaluation_cases"("key");

-- CreateIndex
CREATE INDEX "agent_evaluation_cases_status_idx" ON "agent_evaluation_cases"("status");

-- CreateIndex
CREATE INDEX "agent_evaluation_cases_createdAt_idx" ON "agent_evaluation_cases"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_evaluation_cases_agentSlug_key_key" ON "agent_evaluation_cases"("agentSlug", "key");

-- CreateIndex
CREATE INDEX "agent_evaluation_runs_agentSlug_idx" ON "agent_evaluation_runs"("agentSlug");

-- CreateIndex
CREATE INDEX "agent_evaluation_runs_status_idx" ON "agent_evaluation_runs"("status");

-- CreateIndex
CREATE INDEX "agent_evaluation_runs_startedAt_idx" ON "agent_evaluation_runs"("startedAt");

-- CreateIndex
CREATE INDEX "agent_evaluation_case_results_evaluationRunId_idx" ON "agent_evaluation_case_results"("evaluationRunId");

-- CreateIndex
CREATE INDEX "agent_evaluation_case_results_evaluationCaseId_idx" ON "agent_evaluation_case_results"("evaluationCaseId");

-- CreateIndex
CREATE INDEX "agent_evaluation_case_results_status_idx" ON "agent_evaluation_case_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "roles_key_idx" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_key_idx" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_category_idx" ON "permissions"("category");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_key_key" ON "teams"("key");

-- CreateIndex
CREATE INDEX "teams_key_idx" ON "teams"("key");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "user_agent_access_userId_idx" ON "user_agent_access"("userId");

-- CreateIndex
CREATE INDEX "user_agent_access_agentSlug_idx" ON "user_agent_access"("agentSlug");

-- CreateIndex
CREATE UNIQUE INDEX "user_agent_access_userId_agentSlug_key" ON "user_agent_access"("userId", "agentSlug");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run_steps" ADD CONSTRAINT "agent_run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_artifacts" ADD CONSTRAINT "agent_artifacts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runtime_events" ADD CONSTRAINT "agent_runtime_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "rag_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_actions" ADD CONSTRAINT "browser_actions_browserSessionId_fkey" FOREIGN KEY ("browserSessionId") REFERENCES "browser_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_snapshots" ADD CONSTRAINT "browser_snapshots_browserSessionId_fkey" FOREIGN KEY ("browserSessionId") REFERENCES "browser_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_tools" ADD CONSTRAINT "mcp_tools_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playwright_test_cases" ADD CONSTRAINT "playwright_test_cases_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "playwright_test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_evaluation_case_results" ADD CONSTRAINT "agent_evaluation_case_results_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "agent_evaluation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agent_access" ADD CONSTRAINT "user_agent_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
