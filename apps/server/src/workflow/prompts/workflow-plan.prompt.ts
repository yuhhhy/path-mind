export function buildWorkflowPlanPrompt(goal: string, knownContext: unknown): string {
  return `请为下面的 Workflow 目标生成一个可执行计划。

目标：${goal}
已知上下文：${JSON.stringify(knownContext)}

要求：
- 生成 3-6 个步骤。
- 步骤服务于当前目标，不必是学习步骤。
- 每一步必须有具体 title 和 description。
- 不要加入“等待用户输入”这类伪步骤。
- 只输出严格 JSON：{"steps":[{"title":"...","description":"..."}]}`;
}
