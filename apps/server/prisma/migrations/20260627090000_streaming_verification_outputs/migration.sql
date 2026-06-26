ALTER TABLE "Quiz"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN "draftContent" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Transfer"
  ADD COLUMN "promptStatus" TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN "feedbackStatus" TEXT NOT NULL DEFAULT 'complete';

ALTER TABLE "StepSummary"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'complete';
