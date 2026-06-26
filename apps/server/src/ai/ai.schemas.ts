import { z } from 'zod';

export const streamStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});

export const fullStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});

export const learningPathOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  finalOutcome: z.array(z.string().min(1)).min(1),
  steps: z.array(fullStepSchema).min(4).max(7),
});

export const quizQuestionSchema = z.object({
  type: z.enum(['explain_back', 'single_choice', 'scenario_question']),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

export const quizGenerationSchema = z.object({
  questions: z.array(quizQuestionSchema).min(3).max(4),
});

export const openAnswerGradingSchema = z.object({
  isCorrect: z.boolean(),
  feedback: z.string().min(1),
});

export const transferGenerationSchema = z.object({
  prompt: z.string().min(1),
});

export const transferGradingSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1),
});

export const stepSummarySchema = z.object({
  content: z.string().min(1),
  keyTakeaways: z.array(z.string().min(1)),
  weakPoints: z.array(z.string().min(1)),
  nextSuggestions: z.array(z.string().min(1)),
});

export type QuizGeneration = z.infer<typeof quizGenerationSchema>;
export type OpenAnswerGrading = z.infer<typeof openAnswerGradingSchema>;
export type TransferGeneration = z.infer<typeof transferGenerationSchema>;
export type TransferGrading = z.infer<typeof transferGradingSchema>;
export type StepSummaryGeneration = z.infer<typeof stepSummarySchema>;
