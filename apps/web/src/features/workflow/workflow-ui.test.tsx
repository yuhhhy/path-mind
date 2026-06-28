import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  AgentTrace,
  WorkflowEmptyState,
  WorkflowStatePanel,
  WorkflowWorkspace,
} from '../../routes/workflow';
import type { WorkflowRunResult } from './types';

const now = new Date().toISOString();
const run: WorkflowRunResult = {
  session: {
    id: 'session-1',
    title: '准备前端面试',
    userGoal: '一个月内准备前端面试',
    status: 'completed',
    context: {},
    currentStepId: null,
    finalOutput: '## 最终面试计划\n\n每天完成一个主题。',
    createdAt: now,
    updatedAt: now,
  },
  messages: [
    {
      id: 'message-1',
      sessionId: 'session-1',
      role: 'user',
      content: '我还有一个月',
      createdAt: now,
    },
    {
      id: 'message-2',
      sessionId: 'session-1',
      role: 'assistant',
      content: '我会先梳理你的薄弱项。',
      createdAt: now,
    },
  ],
  steps: [
    {
      id: 'step-1',
      sessionId: 'session-1',
      title: '梳理 React 基础',
      description: '定位薄弱知识点',
      status: 'done',
      order: 0,
      result: '完成',
      createdAt: now,
      updatedAt: now,
    },
  ],
  actions: [
    {
      id: 'action-1',
      sessionId: 'session-1',
      stepId: 'step-1',
      type: 'create_plan',
      reasoningSummary: '信息已经足够，可以建立执行计划',
      input: {},
      output: {},
      status: 'done',
      createdAt: now,
    },
  ],
};

describe('workflow UI', () => {
  it('renders the empty state', () => {
    const html = renderToStaticMarkup(
      <WorkflowEmptyState
        error={null}
        goal=""
        isCreating={false}
        isLoadingSession={false}
        onGoalChange={vi.fn()}
        onOpenSession={vi.fn()}
        onStart={vi.fn()}
        recentSessions={[]}
      />,
    );
    expect(html).toContain('把一句模糊的目标');
    expect(html).toContain('开始 Workflow');
  });

  it('renders messages after a session is created', () => {
    const html = renderToStaticMarkup(
      <WorkflowWorkspace
        draft=""
        error={null}
        isSending={false}
        onDraftChange={vi.fn()}
        onNew={vi.fn()}
        onSend={vi.fn()}
        run={run}
      />,
    );
    expect(html).toContain('我还有一个月');
    expect(html).toContain('我会先梳理你的薄弱项');
    expect(html).toContain('复制这条回复');
    expect(html).toContain('id="workflow-message-message-2"');
    expect(html).toContain('href="#workflow-message-message-2"');
  });

  it('renders status, steps and final output in the state panel', () => {
    const html = renderToStaticMarkup(<WorkflowStatePanel run={run} />);
    expect(html).toContain('已完成');
    expect(html).toContain('梳理 React 基础');
    expect(html).toContain('最终面试计划');
    expect(html).toContain('复制最终结果');
    expect(html).toContain('生成结果');
  });

  it('renders action type and reasoning summary in Agent Trace', () => {
    const html = renderToStaticMarkup(<AgentTrace actions={run.actions} />);
    expect(html).toContain('创建计划');
    expect(html).toContain('信息已经足够，可以建立执行计划');
  });
});
