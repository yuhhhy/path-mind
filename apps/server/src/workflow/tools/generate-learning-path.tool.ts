export function buildWorkflowLearningPathPrompt(goal: string, context: unknown) {
  return `为用户在当前 Workflow 内生成一条轻量、可执行的学习路径，不要创建数据库 Goal。

学习目标：${goal}
Session 上下文：${JSON.stringify(context)}

请用 Markdown 给出阶段、学习重点、练习与完成标准。路径应贴合用户时间和基础；未知信息不要虚构。`;
}
