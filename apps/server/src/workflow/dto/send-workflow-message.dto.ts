import { z } from 'zod';

export const sendWorkflowMessageSchema = z.object({
  content: z.string().trim().min(1, '消息不能为空。').max(10000),
});

export type SendWorkflowMessageDto = z.infer<typeof sendWorkflowMessageSchema>;
