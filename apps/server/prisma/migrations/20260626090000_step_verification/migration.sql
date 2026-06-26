CREATE TABLE "ExplainBack" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "aiFeedback" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "strengths" TEXT[] NOT NULL,
    "improvements" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplainBack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[] NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StepSummary" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keyTakeaways" TEXT[] NOT NULL,
    "weakPoints" TEXT[] NOT NULL,
    "nextSuggestions" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StepSummary_stepId_key" ON "StepSummary"("stepId");

ALTER TABLE "ExplainBack"
ADD CONSTRAINT "ExplainBack_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "LearningStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Quiz"
ADD CONSTRAINT "Quiz_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "LearningStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizQuestion"
ADD CONSTRAINT "QuizQuestion_quizId_fkey"
FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAttempt"
ADD CONSTRAINT "QuizAttempt_quizId_fkey"
FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAnswer"
ADD CONSTRAINT "QuizAnswer_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAnswer"
ADD CONSTRAINT "QuizAnswer_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StepSummary"
ADD CONSTRAINT "StepSummary_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "LearningStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
