import { API_BASE_URL } from '../../shared/config';
import type { WorkflowRunResult, WorkflowSessionSummary } from './types';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Workflow 服务暂时不可用。');
  }
  return response.json() as Promise<T>;
}

export async function createWorkflowSession(userGoal: string): Promise<WorkflowRunResult> {
  const response = await fetch(`${API_BASE_URL}/workflow/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userGoal }),
  });
  return parseResponse(response);
}

export async function getWorkflowSession(sessionId: string): Promise<WorkflowRunResult> {
  const response = await fetch(`${API_BASE_URL}/workflow/sessions/${sessionId}`);
  return parseResponse(response);
}

export async function sendWorkflowMessage(
  sessionId: string,
  content: string,
): Promise<WorkflowRunResult> {
  const response = await fetch(`${API_BASE_URL}/workflow/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return parseResponse(response);
}

export async function getWorkflowSessions(): Promise<WorkflowSessionSummary[]> {
  const response = await fetch(`${API_BASE_URL}/workflow/sessions`);
  return parseResponse(response);
}
