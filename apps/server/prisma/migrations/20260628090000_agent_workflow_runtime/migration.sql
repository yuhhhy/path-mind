CREATE TABLE "WorkflowSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userGoal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB,
    "currentStepId" TEXT,
    "finalOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepId" TEXT,
    "type" TEXT NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowMessage_sessionId_createdAt_idx" ON "WorkflowMessage"("sessionId", "createdAt");
CREATE INDEX "WorkflowStep_sessionId_order_idx" ON "WorkflowStep"("sessionId", "order");
CREATE INDEX "AgentAction_sessionId_createdAt_idx" ON "AgentAction"("sessionId", "createdAt");

ALTER TABLE "WorkflowMessage" ADD CONSTRAINT "WorkflowMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
