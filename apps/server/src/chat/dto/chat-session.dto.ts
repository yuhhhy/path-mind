import { z } from 'zod';

const goalTypeSchema = z.enum([
  'understand_concept',
  'prepare_interview',
  'build_project',
  'pass_exam',
]);

const goalStatusSchema = z.enum(['active', 'completed', 'paused']);
const stepStatusSchema = z.enum(['todo', 'learning', 'done']);

const teachingStrategySchema = z.enum([
  'first_principles',
  'step_by_step',
  'analogy',
  'case_based',
  'source_code_oriented',
]);

const outputFormatSchema = z.enum(['text', 'flowchart', 'mindmap', 'table', 'code_example']);

const assessmentMethodSchema = z.enum([
  'quiz',
  'teach_back',
  'practice_task',
  'interview_question',
]);

const learningConfigSchema = z.object({
  teachingStrategy: teachingStrategySchema,
  preferredOutputFormats: z.array(outputFormatSchema),
  assessmentMethods: z.array(assessmentMethodSchema),
});

const learningStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  status: stepStatusSchema,
  estimatedMinutes: z.number().int().positive(),
});

const goalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  type: goalTypeSchema,
  status: goalStatusSchema,
  progress: z.number().min(0).max(100),
  estimatedMinutes: z.number().int().positive(),
  learningConfig: learningConfigSchema,
  finalOutcome: z.array(z.string()),
  steps: z.array(learningStepSchema),
});

export const chatSessionSchema = z.object({
  goal: goalSchema,
  step: learningStepSchema,
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    }),
  ),
  userMessage: z.string().min(1).optional(),
});

export type ChatSessionDto = z.infer<typeof chatSessionSchema>;
