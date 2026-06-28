import { z } from 'zod';

const workflowPlanSchema = z.object({
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(3)
    .max(6),
});

export function parseWorkflowPlan(content: string) {
  const json = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  return workflowPlanSchema.parse(JSON.parse(json));
}

export function formatPlanMessage(steps: Array<{ title: string; description: string }>) {
  return [
    '计划已经整理好，我会沿着这条路径推进：',
    ...steps.map((step, index) => `${index + 1}. **${step.title}** — ${step.description}`),
  ].join('\n');
}
