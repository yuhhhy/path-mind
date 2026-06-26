import { z } from 'zod';

export const generateQuizSchema = z.object({
  goalId: z.string().min(1),
});

export const submitQuizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1),
});

export const generateTransferSchema = z.object({
  goalId: z.string().min(1),
});

export const submitTransferSchema = z.object({
  goalId: z.string().min(1),
  content: z.string().min(10),
});

export const generateSummarySchema = z.object({
  goalId: z.string().min(1),
});

export type GenerateQuizDto = z.infer<typeof generateQuizSchema>;
export type SubmitQuizAttemptDto = z.infer<typeof submitQuizAttemptSchema>;
export type GenerateTransferDto = z.infer<typeof generateTransferSchema>;
export type SubmitTransferDto = z.infer<typeof submitTransferSchema>;
export type GenerateSummaryDto = z.infer<typeof generateSummarySchema>;
