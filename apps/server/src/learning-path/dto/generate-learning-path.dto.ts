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

export const generateLearningPathSchema = z.object({
  goalTitle: z.string().min(1),
  goalDescription: z.string().optional(),
  goalType: goalTypeSchema,
  learningConfig: z.object({
    teachingStrategy: teachingStrategySchema,
    preferredOutputFormats: z.array(outputFormatSchema).min(1),
    assessmentMethods: z.array(assessmentMethodSchema).min(1),
  }),
});

export type GenerateLearningPathDto = z.infer<typeof generateLearningPathSchema>;
