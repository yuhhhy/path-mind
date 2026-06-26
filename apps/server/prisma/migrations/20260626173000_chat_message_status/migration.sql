-- Add status so interrupted assistant streams can be rendered and resumed.
ALTER TABLE "ChatMessage" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'complete';
