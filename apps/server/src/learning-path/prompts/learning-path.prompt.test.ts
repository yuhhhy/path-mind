import { describe, expect, it } from 'vite-plus/test';
import { buildLearningPathPrompt } from './learning-path.prompt.js';

describe('buildLearningPathPrompt', () => {
  it('includes the goal title and strict JSON requirement', () => {
    const prompt = buildLearningPathPrompt({
      goalTitle: '理解浏览器渲染',
      goalType: 'understand_concept',
      learningConfig: {
        teachingStrategy: 'first_principles',
        preferredOutputFormats: ['text'],
        assessmentMethods: ['teach_back'],
      },
    });

    expect(prompt).toContain('理解浏览器渲染');
    expect(prompt).toContain('严格 JSON');
  });

  it('contains the first principles causal chain requirement', () => {
    const prompt = buildLearningPathPrompt({
      goalTitle: '理解事件循环',
      goalType: 'understand_concept',
      learningConfig: {
        teachingStrategy: 'first_principles',
        preferredOutputFormats: ['flowchart'],
        assessmentMethods: ['interview_question'],
      },
    });

    expect(prompt).toContain('为什么需要');
    expect(prompt).toContain('出现什么问题');
    expect(prompt).toContain('如何解决');
    expect(prompt).toContain('形成什么机制');
  });
});
