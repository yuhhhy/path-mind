-- DropTable
DROP TABLE "ExplainBack";

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "userAnswer" TEXT,
    "aiFeedback" TEXT,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_stepId_key" ON "Transfer"("stepId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "LearningStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
