import type { GenerateLearningPathInput } from '@pathmind/shared';

export function buildLearningPathPrompt(input: GenerateLearningPathInput) {
  const { learningConfig } = input;

  return `
你是 PathMind 的 Learning Path Generator。

你的任务是把用户输入的学习目标拆成一条可执行的学习路径。

用户目标：
- goalTitle: ${input.goalTitle}
- goalDescription: ${input.goalDescription || '无'}
- goalType: ${input.goalType}
- teachingStrategy: ${learningConfig.teachingStrategy}
- preferredOutputFormats: ${learningConfig.preferredOutputFormats.join(', ')}
- assessmentMethods: ${learningConfig.assessmentMethods.join(', ')}

生成时遵守：
1. 不要生成泛泛的课程目录。
2. 每个 step 都必须解决一个明确的学习问题。
3. 每个 step 都应该能被用户完成。
4. 路径应该符合用户的 teachingStrategy。
5. 如果 teachingStrategy 是 first_principles，要按照"为什么需要 → 出现什么问题 → 如何解决 → 形成什么机制"的逻辑组织。
6. assessmentMethods 只代表每个 Step 完成后的独立验证流程，不要把复述、小测、面试题或实践任务生成为单独的学习 Step。
7. 每个 step 应该是知识点、能力点或项目推进节点，不要是"用自己的话讲一遍"这类验证动作。
8. steps 数量必须在 4-7 个之间。
9. finalOutcome 必须具体、可验证。
10. estimatedMinutes 必须合理，单位为分钟。
11. 输出必须是严格 JSON，不要 Markdown，不要解释，不要代码块。

严格返回以下 JSON 结构：
{
  "title": "string",
  "description": "string",
  "estimatedMinutes": 60,
  "finalOutcome": ["string"],
  "steps": [
    {
      "id": "kebab-case-id",
      "title": "string",
      "description": "string",
      "estimatedMinutes": 10
    }
  ]
}
`.trim();
}
