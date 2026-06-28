export function buildGenerateContentPrompt(input: {
  goal: string;
  context: unknown;
  step?: { title: string; description: string };
  instruction?: unknown;
}) {
  return `围绕当前 Workflow 生成可直接交付给用户的内容。

总目标：${input.goal}
当前步骤：${input.step ? `${input.step.title} — ${input.step.description}` : '无独立步骤'}
Session 上下文：${JSON.stringify(input.context)}
额外要求：${typeof input.instruction === 'string' ? input.instruction : '无'}

请使用清晰的 Markdown。内容要具体、可信、可执行，不要描述你自己的内部推理。`;
}
