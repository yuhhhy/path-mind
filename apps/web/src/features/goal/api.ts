import type {
  GenerateLearningPathInput,
  GenerateLearningPathOutput,
  Goal,
  LearningConfig,
  LearningStep,
} from '@pathmind/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface CreateGoalInput {
  title: string;
  description: string;
  type: Goal['type'];
  estimatedMinutes: number;
  learningConfig: LearningConfig;
  finalOutcome: string[];
  steps: Array<{
    title: string;
    description: string;
    estimatedMinutes: number;
  }>;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function mapGeneratedPathToCreateGoalInput(
  input: GenerateLearningPathInput,
  output: GenerateLearningPathOutput,
): CreateGoalInput {
  return {
    title: output.title,
    description: output.description,
    type: input.goalType,
    estimatedMinutes: output.estimatedMinutes,
    learningConfig: input.learningConfig,
    finalOutcome: output.finalOutcome,
    steps: output.steps.map((step) => ({
      title: step.title,
      description: step.description,
      estimatedMinutes: step.estimatedMinutes,
    })),
  };
}

export async function getGoals(): Promise<Goal[]> {
  const response = await fetch(`${API_BASE_URL}/goals`);
  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或数据库。');
}

export async function getGoal(goalId: string): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${goalId}`);
  return parseJsonResponse(response, '没有找到这个 Goal。');
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或数据库。');
}

export async function generateLearningPath(
  input: GenerateLearningPathInput,
): Promise<GenerateLearningPathOutput> {
  const response = await fetch(`${API_BASE_URL}/learning-path/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('AI 服务暂时不可用，请检查后端服务或 API Key。');
  }

  return response.json() as Promise<GenerateLearningPathOutput>;
}

export async function generateAndSaveLearningPath(input: GenerateLearningPathInput): Promise<Goal> {
  const generatedPath = await generateLearningPath(input);
  return createGoal(mapGeneratedPathToCreateGoalInput(input, generatedPath));
}

export async function initGoal(input: GenerateLearningPathInput): Promise<{ goalId: string }> {
  const response = await fetch(`${API_BASE_URL}/learning-path/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或 API Key。');
}

interface StepStreamCallbacks {
  onStep(step: LearningStep): void;
  onDone(): void;
  onError(error: Error): void;
}

type StepSseEvent =
  | { type: 'step'; step: LearningStep }
  | { type: 'done' }
  | { type: 'error'; message: string };

function parseStepEvent(rawEvent: string): StepSseEvent | null {
  const data = rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();
  if (!data) return null;
  try {
    return JSON.parse(data) as StepSseEvent;
  } catch {
    return null;
  }
}

export function streamGoalSteps(goalId: string, callbacks: StepStreamCallbacks): () => void {
  const controller = new AbortController();

  void (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-path/${goalId}/stream`, {
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('AI 服务暂时不可用，请检查后端服务或 API Key。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const events = buffer.split(/\n\n/);
        buffer = events.pop() ?? '';

        for (const eventText of events) {
          const event = parseStepEvent(eventText);
          if (!event) continue;
          if (event.type === 'step') {
            callbacks.onStep(event.step);
          } else if (event.type === 'done') {
            callbacks.onDone();
            return;
          } else if (event.type === 'error') {
            callbacks.onError(new Error(event.message));
            return;
          }
        }
      }

      callbacks.onDone();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      callbacks.onError(
        error instanceof Error ? error : new Error('AI 服务暂时不可用，请检查后端服务或 API Key。'),
      );
    }
  })();

  return () => {
    controller.abort();
  };
}

export async function completeStep(goalId: string, stepId: string): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${goalId}/steps/${stepId}/complete`, {
    method: 'PATCH',
  });

  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或数据库。');
}
