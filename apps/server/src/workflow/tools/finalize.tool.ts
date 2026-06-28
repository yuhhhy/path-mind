export function buildFinalizePrompt(goal: string, context: unknown, completedResults: string[]) {
  return `整合当前 Workflow 的最终交付结果。

用户目标：${goal}
Session 上下文：${JSON.stringify(context)}
各步骤结果：${completedResults.join('\n\n---\n\n')}

请输出一份完整、自包含、可直接使用的 Markdown 最终结果。不要提及内部 action、prompt 或推理过程。`;
}
