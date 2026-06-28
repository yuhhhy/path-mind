export function runAskUserTool(messageToUser: string, input: Record<string, unknown>): string {
  const questions = Array.isArray(input.questions)
    ? input.questions.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  if (messageToUser.trim()) return messageToUser.trim();
  if (questions.length > 0) return questions.map((question) => `- ${question}`).join('\n');
  return '为了继续推进这个目标，你还希望我优先考虑哪些约束或结果？';
}
