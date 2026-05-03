-- AlterTable
ALTER TABLE "agent_approvals" ADD COLUMN "requestedByUserId" TEXT;
ALTER TABLE "agent_approvals" ADD COLUMN "resolvedByEmail" TEXT;
ALTER TABLE "agent_approvals" ADD COLUMN "resolvedByUserId" TEXT;

-- AlterTable
ALTER TABLE "agent_audit_logs" ADD COLUMN "actorEmail" TEXT;

-- AlterTable
ALTER TABLE "agent_runs" ADD COLUMN "actorEmail" TEXT;
ALTER TABLE "agent_runs" ADD COLUMN "actorUserId" TEXT;

-- CreateTable
CREATE TABLE "browser_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "agentSlug" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "headless" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "browser_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "browserSessionId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "selector" TEXT,
    "value" TEXT,
    "url" TEXT,
    "resultJson" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "browser_actions_browserSessionId_fkey" FOREIGN KEY ("browserSessionId") REFERENCES "browser_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "browser_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "browserSessionId" TEXT NOT NULL,
    "runId" TEXT,
    "url" TEXT,
    "title" TEXT,
    "screenshotPath" TEXT,
    "screenshotUrl" TEXT,
    "domSummary" TEXT,
    "textContent" TEXT,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "browser_snapshots_browserSessionId_fkey" FOREIGN KEY ("browserSessionId") REFERENCES "browser_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "department" TEXT,
    "jobTitle" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_agent_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentSlug" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_agent_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE INDEX "agent_approvals_requestedByUserId_idx" ON "agent_approvals"("requestedByUserId");

-- CreateIndex
CREATE INDEX "agent_approvals_resolvedByUserId_idx" ON "agent_approvals"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "agent_audit_logs_actorUserId_idx" ON "agent_audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "agent_runs_actorUserId_idx" ON "agent_runs"("actorUserId");
