import type {
  GenerateLearningPathInput,
  GenerateLearningPathOutput,
  Goal,
  LearningConfig,
  LearningStep,
  Quiz,
  QuizAttemptAnswer,
  SseEvent,
  StepSummary,
  StepVerification,
  Transfer,
} from '@pathmind/shared';
import { API_BASE_URL } from '../../shared/config';
import { streamSseEvents } from '../../shared/sse-stream';
import { extractSseData } from '../chat/sse';

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

type StepSseEvent = Extract<SseEvent, { type: 'step' | 'done' | 'error' }>;

function parseStepEvent(rawEvent: string): StepSseEvent | null {
  const data = extractSseData(rawEvent);
  if (!data) return null;
  try {
    return JSON.parse(data) as StepSseEvent;
  } catch {
    return null;
  }
}

export function streamGoalSteps(goalId: string, callbacks: StepStreamCallbacks): () => void {
  return streamSseEvents(
    { url: `${API_BASE_URL}/learning-path/${goalId}/stream` },
    (rawEvent) => {
      const event = parseStepEvent(rawEvent);
      if (!event) return;
      if (event.type === 'step') {
        callbacks.onStep(event.step);
      } else if (event.type === 'done') {
        callbacks.onDone();
      } else if (event.type === 'error') {
        callbacks.onError(new Error(event.message));
      }
    },
    (error) => callbacks.onError(error),
  );
}

export async function completeStep(
  goalId: string,
  stepId: string,
  options: { force?: boolean } = {},
): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${goalId}/steps/${stepId}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: options.force === true }),
  });

  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或数据库。');
}

export async function getStepVerification(stepId: string): Promise<StepVerification> {
  const response = await fetch(`${API_BASE_URL}/steps/${stepId}/verification`);
  return parseJsonResponse(response, '没有找到这个学习 Step 的验证状态。');
}

export async function generateQuiz(input: { goalId: string; stepId: string }): Promise<Quiz> {
  const response = await fetch(`${API_BASE_URL}/steps/${input.stepId}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goalId: input.goalId }),
  });

  return parseJsonResponse(response, 'AI 生成测验失败，请稍后重试。');
}

export async function submitQuizAttempt(input: {
  quizId: string;
  answers: Array<{ questionId: string; answer: string }>;
}): Promise<{ score: number; results: QuizAttemptAnswer[] }> {
  const response = await fetch(`${API_BASE_URL}/quizzes/${input.quizId}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: input.answers }),
  });

  return parseJsonResponse(response, '提交测验失败，请稍后重试。');
}

export async function generateTransfer(input: {
  goalId: string;
  stepId: string;
}): Promise<Transfer> {
  const response = await fetch(`${API_BASE_URL}/steps/${input.stepId}/transfer/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goalId: input.goalId }),
  });

  return parseJsonResponse(response, 'AI 生成迁移应用题失败，请稍后重试。');
}

export async function submitTransfer(input: {
  goalId: string;
  stepId: string;
  content: string;
}): Promise<Transfer> {
  const response = await fetch(`${API_BASE_URL}/steps/${input.stepId}/transfer/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goalId: input.goalId, content: input.content }),
  });

  return parseJsonResponse(response, 'AI 批改迁移应用失败，请稍后重试。');
}

export async function generateStepSummary(input: {
  goalId: string;
  stepId: string;
}): Promise<StepSummary> {
  const response = await fetch(`${API_BASE_URL}/steps/${input.stepId}/summary/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goalId: input.goalId }),
  });

  return parseJsonResponse(response, 'AI 生成总结失败，请稍后重试。');
}

export async function deleteGoal(goalId: string): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/goals/${goalId}`, {
    method: 'DELETE',
  });

  return parseJsonResponse(response, '删除失败，请稍后重试。');
}
