export function buildWorkflowSummaryPrompt(
  goal: string,
  context: unknown,
  completedResults: string[],
) {
  return `总结当前 Workflow 的阶段进展。

目标：${goal}
Session 上下文：${JSON.stringify(context)}
已完成结果：${completedResults.join('\n\n')}

请用简洁 Markdown 总结已完成内容、当前结论和下一步，不要声称目标已经完成。`;
}
