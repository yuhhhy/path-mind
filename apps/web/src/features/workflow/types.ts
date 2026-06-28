export type WorkflowSessionStatus =
  | 'clarifying'
  | 'planning'
  | 'running'
  | 'waiting_user'
  | 'completed'
  | 'failed';

export type WorkflowStepStatus = 'todo' | 'running' | 'waiting_user' | 'done' | 'failed';
export type AgentActionStatus = 'running' | 'done' | 'failed';

export interface WorkflowSession {
  id: string;
  title: string;
  userGoal: string;
  status: WorkflowSessionStatus;
  context: Record<string, unknown> | null;
  currentStepId: string | null;
  finalOutput: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface WorkflowStep {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  status: WorkflowStepStatus;
  order: number;
  result: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAction {
  id: string;
  sessionId: string;
  stepId: string | null;
  type: string;
  reasoningSummary: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  status: AgentActionStatus;
  createdAt: string;
}

export interface WorkflowRunResult {
  session: WorkflowSession;
  messages: WorkflowMessage[];
  steps: WorkflowStep[];
  actions: AgentAction[];
}

export interface WorkflowSessionSummary extends Omit<WorkflowSession, 'context' | 'createdAt'> {
  createdAt: string;
  _count: { messages: number; steps: number; actions: number };
}
