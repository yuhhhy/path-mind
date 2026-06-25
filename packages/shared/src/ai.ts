import type { Goal, GoalType, LearningConfig, LearningStep } from './goal.js';

export interface GenerateLearningPathInput {
  goalTitle: string;
  goalDescription?: string;
  goalType: GoalType;
  learningConfig: LearningConfig;
}

export interface GeneratedLearningStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
}

export interface GenerateLearningPathOutput {
  title: string;
  description: string;
  estimatedMinutes: number;
  finalOutcome: string[];
  steps: GeneratedLearningStep[];
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatSessionInput {
  goal: Goal;
  step: LearningStep;
  messages: ChatMessage[];
}
