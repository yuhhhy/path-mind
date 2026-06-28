import { BadGatewayException } from '@nestjs/common';
import { z } from 'zod';
import { workflowActionTypes } from '../tools/workflow-tool.types.js';
import type { WorkflowDecision } from '../tools/workflow-tool.types.js';

const workflowDecisionSchema = z.object({
  action: z.enum(workflowActionTypes),
  reasoningSummary: z.string().min(1).max(500),
  messageToUser: z.string(),
  toolInput: z.record(z.string(), z.unknown()).default({}),
  shouldContinue: z.boolean(),
});

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseWorkflowDecision(content: string): WorkflowDecision {
  try {
    return workflowDecisionSchema.parse(JSON.parse(stripJsonFence(content)));
  } catch (error) {
    throw new BadGatewayException({
      message: 'Workflow Agent 返回了不合法的决策 JSON。',
      detail: error instanceof Error ? error.message : 'Unknown parse error',
    });
  }
}
