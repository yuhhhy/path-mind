import type { GenerateLearningPathInput, GenerateLearningPathOutput } from '@pathmind/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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
