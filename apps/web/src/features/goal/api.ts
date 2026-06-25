import type {
  GenerateLearningPathInput,
  GenerateLearningPathOutput,
  Goal,
  LearningConfig,
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

export async function completeStep(goalId: string, stepId: string): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${goalId}/steps/${stepId}/complete`, {
    method: 'PATCH',
  });

  return parseJsonResponse(response, 'AI 服务暂时不可用，请检查后端服务或数据库。');
}
