export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'AI 生成失败，请稍后重试。';
}
