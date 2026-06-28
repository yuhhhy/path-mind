import { z } from 'zod';

export const createWorkflowSessionSchema = z.object({
  userGoal: z.string().trim().min(1, '请输入想要推进的目标。').max(5000),
});

export type CreateWorkflowSessionDto = z.infer<typeof createWorkflowSessionSchema>;
