export const workflowActionTypes = [
  'ask_user',
  'create_plan',
  'update_plan',
  'execute_step',
  'generate_content',
  'generate_learning_path',
  'create_quiz',
  'summarize',
  'finalize',
  'wait_user',
] as const;

export type WorkflowActionType = (typeof workflowActionTypes)[number];

export interface WorkflowDecision {
  action: WorkflowActionType;
  reasoningSummary: string;
  messageToUser: string;
  toolInput: Record<string, unknown>;
  shouldContinue: boolean;
}

export interface WorkflowPlanStepInput {
  title: string;
  description: string;
}

export interface WorkflowExecutionResult {
  message: string;
  output: Record<string, unknown>;
  shouldStop: boolean;
}
