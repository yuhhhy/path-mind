import { describe, expect, it } from 'vite-plus/test';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { WorkflowContextBuilder } from './workflow-context.builder.js';
import type { LoadedWorkflow } from './workflow-context.builder.js';

describe('WorkflowContextBuilder', () => {
  it('builds bounded messages and recent action context with all steps', () => {
    const builder = new WorkflowContextBuilder({} as PrismaService);
    const now = new Date();
    const workflow = {
      id: 'session-1',
      title: '准备面试',
      userGoal: '准备前端面试',
      status: 'running',
      context: { lastUserMessage: '一个月' },
      currentStepId: 'step-1',
      finalOutput: null,
      createdAt: now,
      updatedAt: now,
      messages: Array.from({ length: 25 }, (_, index) => ({
        id: `message-${index}`,
        sessionId: 'session-1',
        role: index % 2 ? 'assistant' : 'user',
        content: `message ${index}`,
        createdAt: now,
      })),
      steps: [
        {
          id: 'step-1',
          sessionId: 'session-1',
          title: '盘点基础',
          description: '确认当前能力',
          status: 'todo',
          order: 0,
          result: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      actions: Array.from({ length: 12 }, (_, index) => ({
        id: `action-${index}`,
        sessionId: 'session-1',
        stepId: null,
        type: 'generate_content',
        reasoningSummary: `action ${index}`,
        input: null,
        output: null,
        status: 'done',
        createdAt: now,
      })),
    } as LoadedWorkflow;

    const context = builder.build(workflow);

    expect(context.messages).toHaveLength(20);
    expect(context.messages[0]?.content).toBe('message 5');
    expect(context.steps).toHaveLength(1);
    expect(context.recentActions).toHaveLength(10);
    expect(context.session.context).toEqual({ lastUserMessage: '一个月' });
  });
});
