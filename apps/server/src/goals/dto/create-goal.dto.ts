import { z } from 'zod';

const goalTypeSchema = z.enum([
  'understand_concept',
  'prepare_interview',
  'build_project',
  'pass_exam',
]);

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

export const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: goalTypeSchema,
  estimatedMinutes: z.number().int().positive(),
  learningConfig: z.object({
    teachingStrategy: teachingStrategySchema,
    preferredOutputFormats: z.array(outputFormatSchema).min(1),
    assessmentMethods: z.array(assessmentMethodSchema).min(1),
  }),
  finalOutcome: z.array(z.string().min(1)).min(1),
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        estimatedMinutes: z.number().int().positive(),
      }),
    )
    .min(1),
});

export type CreateGoalDto = z.infer<typeof createGoalSchema>;
