export function buildWorkflowQuizPrompt(goal: string, context: unknown, stepTitle?: string) {
  return `为当前 Workflow 生成一个用于检验理解的小测。

目标：${goal}
当前主题：${stepTitle ?? goal}
Session 上下文：${JSON.stringify(context)}

请用 Markdown 给出 3-5 道有区分度的题目。先只展示题目，不直接泄露答案，并邀请用户作答。`;
}
