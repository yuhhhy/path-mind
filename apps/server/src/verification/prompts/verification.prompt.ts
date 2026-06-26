interface StepContext {
  goalTitle: string;
  goalDescription: string;
  stepTitle: string;
  stepDescription: string;
  teachingContent: string;
}

interface QuizPromptInput extends StepContext {}

interface GradeOpenAnswerPromptInput {
  questionType: 'explain_back' | 'scenario_question';
  question: string;
  correctAnswer: string;
  explanation: string;
  userAnswer: string;
}

interface GradeShortAnswerPromptInput {
  question: string;
  correctAnswer: string;
  explanation: string;
  userAnswer: string;
}

interface TransferPromptInput extends StepContext {
  quizResults: Array<{
    question: string;
    answer: string;
    isCorrect: boolean;
    feedback: string;
  }>;
}

interface GradeTransferPromptInput {
  stepTitle: string;
  stepDescription: string;
  transferPrompt: string;
  userAnswer: string;
}

interface SummaryPromptInput extends StepContext {
  quizScore: number;
  quizResults: Array<{
    question: string;
    answer: string;
    isCorrect: boolean;
    feedback: string;
  }>;
  transfer: {
    prompt: string;
    userAnswer: string;
    aiFeedback: string;
    score: number;
  };
}

function compactContent(content: string, maxLength = 6000) {
  const normalized = content.trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(-maxLength);
}

export function buildQuizPrompt(input: QuizPromptInput) {
  return `
你是 PathMind 的学习教练。请基于当前 Goal、Step 和本节教学内容，生成一套综合测验题。

Goal:
${input.goalTitle}
${input.goalDescription}

Step:
${input.stepTitle}
${input.stepDescription}

本节 AI 教学内容:
${compactContent(input.teachingContent)}

请生成以下三种题型，合计 3-4 道题：
1. explain_back（必须有且只有 1 道）：让用户用自己的话讲一遍本节核心内容，不能只是简单复述，要考察整体理解。options 留空数组。
2. single_choice（1-2 道）：概念判断或选择题，验证关键概念的准确理解。每题提供 3-4 个 options，correctAnswer 必须和其中一个 option 完全一致。
3. scenario_question（必须有且只有 1 道）：面试题或场景题，考察知识在实际情境中的运用。options 留空数组。

题目顺序：explain_back → single_choice → scenario_question。

请严格输出 JSON，不要 Markdown，不要解释 JSON 外的内容:
{
  "questions": [
    {
      "type": "explain_back" | "single_choice" | "scenario_question",
      "question": string,
      "options": string[],
      "correctAnswer": string,
      "explanation": string
    }
  ]
}
`.trim();
}

export function buildGradeOpenAnswerPrompt(input: GradeOpenAnswerPromptInput) {
  const typeLabel = input.questionType === 'explain_back' ? '整体理解复述' : '场景应用题';
  return `
你是 PathMind 的学习教练。请判断用户对「${typeLabel}」的作答是否达到要求。

题目:
${input.question}

参考答案要点:
${input.correctAnswer}

评分说明:
${input.explanation}

用户答案:
${input.userAnswer}

评判标准：是否表达了核心理解，不要求措辞完美，只要意思准确、关键点覆盖到即可。
explain_back 考察整体理解，scenario_question 考察知识迁移应用。

请严格输出 JSON:
{
  "isCorrect": boolean,
  "feedback": string
}
`.trim();
}

export function buildGradeShortAnswerPrompt(input: GradeShortAnswerPromptInput) {
  return `
你是 PathMind 的学习教练。请判断用户对简答题的回答是否表达了核心理解。

题目:
${input.question}

参考答案:
${input.correctAnswer}

参考解释:
${input.explanation}

用户答案:
${input.userAnswer}

请严格输出 JSON:
{
  "isCorrect": boolean,
  "feedback": string
}
`.trim();
}

export function buildTransferPrompt(input: TransferPromptInput) {
  const weakAreas = input.quizResults
    .filter((r) => !r.isCorrect)
    .map((r) => r.question)
    .join('\n');

  return `
你是 PathMind 的学习教练。用户已经完成了「${input.stepTitle}」的学习和测验。
请为该用户设计一道「迁移应用」题：把本节知识迁移到一个真实场景中，要求比普通测验更高阶。

Goal:
${input.goalTitle}
${input.goalDescription}

Step:
${input.stepTitle}
${input.stepDescription}

本节 AI 教学内容（摘要）:
${compactContent(input.teachingContent, 3000)}

用户测验中答错的题目（薄弱点）:
${weakAreas || '无（全部答对）'}

要求：
- 设计一个真实、具体的场景（例如：一个实际问题、一段对话、一个 bug 报告等）
- 场景要能触发用户用本节知识分析和解决问题
- 不要设计成选择题，而是开放性的"请你分析 / 请你解释 / 请你设计"类型
- prompt 字段只包含题目本身（场景描述 + 问题），不包含答案或提示

请严格输出 JSON，不要 Markdown:
{
  "prompt": string
}
`.trim();
}

export function buildGradeTransferPrompt(input: GradeTransferPromptInput) {
  return `
你是 PathMind 的学习教练。用户正在完成「迁移应用」环节，需要把本节知识应用到真实场景。

本节主题:
${input.stepTitle} — ${input.stepDescription}

迁移题目（场景描述）:
${input.transferPrompt}

用户回答:
${input.userAnswer}

评判要点：
- 是否识别出了题目中的关键问题
- 是否正确运用了本节核心知识
- 分析是否有逻辑、有层次
- 不要求答案完美，但要能体现知识的真实迁移

请严格输出 JSON，不要 Markdown:
{
  "score": number,
  "feedback": string
}

score 为 0-100 的整数，反映迁移应用质量。feedback 要具体指出哪里做得好、哪里可以更深入。
`.trim();
}

export function buildStepSummaryPrompt(input: SummaryPromptInput) {
  return `
你是 PathMind 的学习教练。请根据 AI 教学内容、测验表现、迁移应用，生成当前 Step 的学习总结。
总结不是复述原文，而是帮助用户沉淀：本节真正学会了什么、哪些地方还薄弱、下一步怎么补。

Goal:
${input.goalTitle}
${input.goalDescription}

Step:
${input.stepTitle}
${input.stepDescription}

本节 AI 教学内容:
${compactContent(input.teachingContent)}

Quiz 分数: ${input.quizScore}

Quiz 表现:
${input.quizResults
  .map(
    (result, index) =>
      `${index + 1}. ${result.question}\n用户回答：${result.answer}\n是否正确：${result.isCorrect}\n反馈：${result.feedback}`,
  )
  .join('\n\n')}

迁移应用题目:
${input.transfer.prompt}

用户迁移回答:
${input.transfer.userAnswer}

迁移评价（${input.transfer.score} 分）:
${input.transfer.aiFeedback}

请严格输出 JSON，不要 Markdown fence:
{
  "content": string,
  "keyTakeaways": string[],
  "weakPoints": string[],
  "nextSuggestions": string[]
}

content 必须是 Markdown 正文。
`.trim();
}
