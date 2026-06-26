export type GoalStatus = 'active' | 'completed' | 'paused' | 'initializing' | 'failed';

export type GoalType = 'understand_concept' | 'prepare_interview' | 'build_project' | 'pass_exam';

export type TeachingStrategy =
  | 'first_principles'
  | 'step_by_step'
  | 'analogy'
  | 'case_based'
  | 'source_code_oriented';

export type OutputFormat = 'text' | 'flowchart' | 'mindmap' | 'table' | 'code_example';

export type AssessmentMethod = 'quiz' | 'teach_back' | 'practice_task' | 'interview_question';

export type LearningStepStatus = 'todo' | 'learning' | 'done';

export interface LearningConfig {
  teachingStrategy: TeachingStrategy;
  preferredOutputFormats: OutputFormat[];
  assessmentMethods: AssessmentMethod[];
}

export interface LearningStep {
  id: string;
  title: string;
  description: string;
  status: LearningStepStatus;
  estimatedMinutes: number;
}

export type QuizQuestionType = 'explain_back' | 'single_choice' | 'scenario_question';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  order: number;
}

export interface Quiz {
  id: string;
  goalId: string;
  stepId: string;
  status: 'streaming' | 'complete';
  draftContent: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizAttemptAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  feedback: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  answers: QuizAttemptAnswer[];
  score: number;
  createdAt: string;
}

export interface Transfer {
  id: string;
  goalId: string;
  stepId: string;
  prompt: string;
  promptStatus: 'streaming' | 'complete';
  userAnswer?: string;
  aiFeedback?: string;
  feedbackStatus: 'streaming' | 'complete';
  score?: number;
  createdAt: string;
}

export interface StepSummary {
  id: string;
  goalId: string;
  stepId: string;
  content: string;
  status: 'streaming' | 'complete';
  keyTakeaways: string[];
  weakPoints: string[];
  nextSuggestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StepVerification {
  quiz?: Quiz;
  latestAttempt?: QuizAttempt;
  transfer?: Transfer;
  summary?: StepSummary;
  canCompleteStep: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
  progress: number;
  estimatedMinutes: number;
  learningConfig: LearningConfig;
  finalOutcome: string[];
  steps: LearningStep[];
}
