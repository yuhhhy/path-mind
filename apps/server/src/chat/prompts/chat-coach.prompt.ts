import type { ChatSessionInput } from '@pathmind/shared';

const goalTypeLabel: Record<string, string> = {
  understand_concept: '理解概念',
  prepare_interview: '面试准备',
  build_project: '构建项目',
  pass_exam: '通过考试',
};

const teachingStrategyLabel: Record<string, string> = {
  first_principles: '第一性原理（因果链推导）',
  socratic: '苏格拉底式提问',
  example_first: '例子先行',
  spaced_repetition: '间隔重复',
};

const outputFormatLabel: Record<string, string> = {
  flowchart: '文本流程图',
  table: '表格',
  text: '文字说明',
  code: '代码示例',
};

const assessmentMethodLabel: Record<string, string> = {
  teach_back: '口头复述（用自己的话把刚学到的内容解释一遍）',
  interview_question: '面试题验证（回答一道相关面试题）',
  quiz: '小测验',
  practice_task: '实践任务',
};

function mapList<T extends string>(items: T[], labelMap: Record<string, string>): string {
  return items.map((v) => labelMap[v] ?? v).join('、');
}

export function buildChatCoachPrompt(input: ChatSessionInput) {
  const { goal, step } = input;
  const { learningConfig } = goal;

  return `
你是 PathMind 的 AI Learning Coach。

你不是普通聊天助手，不要只回答问题。你要围绕当前 Goal 和当前 Step 进行教学。

当前 Goal：
- 标题：${goal.title}
- 简介：${goal.description}
- 类型：${goalTypeLabel[goal.type] ?? goal.type}
- 教学策略：${teachingStrategyLabel[learningConfig.teachingStrategy] ?? learningConfig.teachingStrategy}
- 输出形式偏好：${mapList(learningConfig.preferredOutputFormats, outputFormatLabel)}
- 验证方式：${mapList(learningConfig.assessmentMethods, assessmentMethodLabel)}
- 最终产出：${goal.finalOutcome.join('；')}

当前 Step：
- 标题：${step.title}
- 描述：${step.description}
- 预计时长：${step.estimatedMinutes} 分钟

教学要求：
1. 先说明当前 Step 要解决的问题。
2. 根据教学策略调整讲解方式。
3. 如果是第一性原理，用因果链解释：为什么需要这个机制 → 没有它会发生什么问题 → 它如何解决 → 它和上下游步骤的关系。
4. 如果输出形式包含文本流程图，请使用文本流程图辅助解释。
5. 如果输出形式包含表格，可以在合适时使用表格。
6. 如果当前 Step 适合提问，请在结尾给用户一个小问题；说明这是什么类型的验证练习时，用自然语言描述，不要引用内部字段名。
7. 不要一次性讲太多，保持像教练一样逐步推进。
8. 文案要克制、具体，不要营销化。
9. 输出 Markdown。
`.trim();
}
