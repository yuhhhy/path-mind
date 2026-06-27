import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { QuizSection, TransferSection } from './VerificationUI';

const noop = vi.fn();

describe('submitted verification answers', () => {
  it('shows the persisted quiz answer without rendering another input', () => {
    const html = renderToStaticMarkup(
      <QuizSection
        generateError={undefined}
        isGenerating={false}
        isSubmitting={false}
        latestAttempt={{
          score: 100,
          answers: [
            {
              questionId: 'question-1',
              answer: '这是我已经提交的回答',
              isCorrect: true,
              feedback: '回答正确',
            },
          ],
        }}
        onAnswerChange={noop}
        onRetryGenerate={noop}
        onSubmit={noop}
        quiz={{
          id: 'quiz-1',
          goalId: 'goal-1',
          stepId: 'step-1',
          status: 'complete',
          draftContent: '',
          createdAt: new Date().toISOString(),
          questions: [
            {
              id: 'question-1',
              type: 'explain_back',
              question: '请解释这个概念',
              correctAnswer: '参考答案',
              explanation: '解析',
              order: 0,
            },
          ],
        }}
        quizAnswers={{}}
        submitError={undefined}
      />,
    );

    expect(html).toContain('这是我已经提交的回答');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('提交测验');
  });

  it('keeps the submitted choice selected and disables all choice inputs', () => {
    const html = renderToStaticMarkup(
      <QuizSection
        generateError={undefined}
        isGenerating={false}
        isSubmitting={false}
        latestAttempt={{
          score: 100,
          answers: [
            {
              questionId: 'question-1',
              answer: '选项 B',
              isCorrect: true,
              feedback: '回答正确',
            },
          ],
        }}
        onAnswerChange={noop}
        onRetryGenerate={noop}
        onSubmit={noop}
        quiz={{
          id: 'quiz-1',
          goalId: 'goal-1',
          stepId: 'step-1',
          status: 'complete',
          draftContent: '',
          createdAt: new Date().toISOString(),
          questions: [
            {
              id: 'question-1',
              type: 'single_choice',
              question: '请选择正确答案',
              options: ['选项 A', '选项 B'],
              correctAnswer: '选项 B',
              explanation: '解析',
              order: 0,
            },
          ],
        }}
        quizAnswers={{}}
        submitError={undefined}
      />,
    );

    expect(html).toContain('选项 A');
    expect(html).toContain('选项 B');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).not.toContain('你的回答');
  });

  it('keeps the submitted transfer answer read-only', () => {
    const html = renderToStaticMarkup(
      <TransferSection
        draft=""
        generateError={undefined}
        isGenerating={false}
        isSubmitting={false}
        onDraftChange={noop}
        onRetryGenerate={noop}
        onSubmit={noop}
        submitError={undefined}
        transfer={{
          id: 'transfer-1',
          goalId: 'goal-1',
          stepId: 'step-1',
          prompt: '迁移问题',
          promptStatus: 'complete',
          userAnswer: '这是迁移回答',
          aiFeedback: '迁移反馈',
          feedbackStatus: 'complete',
          score: 90,
          createdAt: new Date().toISOString(),
        }}
      />,
    );

    expect(html).toContain('这是迁移回答');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('提交答案');
  });
});
