import type { ChatSessionInput } from '@pathmind/shared';
import { describe, expect, it } from 'vite-plus/test';
import { buildChatCoachPrompt } from './chat-coach.prompt.js';

const input: ChatSessionInput = {
  goal: {
    id: 'goal-1',
    title: '理解浏览器渲染',
    description: '从 URL 到页面绘制',
    type: 'understand_concept',
    status: 'active',
    progress: 0,
    estimatedMinutes: 60,
    learningConfig: {
      teachingStrategy: 'first_principles',
      preferredOutputFormats: ['flowchart', 'text'],
      assessmentMethods: ['teach_back'],
    },
    finalOutcome: ['能讲清主链路'],
    steps: [],
  },
  step: {
    id: 'network',
    title: '理解网络请求阶段',
    description: '理解 DNS、TCP、TLS、HTTP 的顺序',
    status: 'learning',
    estimatedMinutes: 12,
  },
  messages: [],
};

describe('buildChatCoachPrompt', () => {
  it('includes current goal and step context', () => {
    const prompt = buildChatCoachPrompt(input);

    expect(prompt).toContain('理解浏览器渲染');
    expect(prompt).toContain('理解网络请求阶段');
  });

  it('includes the teaching strategy and flowchart instruction', () => {
    const prompt = buildChatCoachPrompt(input);

    expect(prompt).toContain('first_principles');
    expect(prompt).toContain('flowchart');
    expect(prompt).toContain('文本流程图');
  });
});
