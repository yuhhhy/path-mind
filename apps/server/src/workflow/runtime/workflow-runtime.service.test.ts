import { describe, expect, it, vi } from 'vite-plus/test';
import type { AiService } from '../../ai/ai.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { WorkflowDecision } from '../tools/workflow-tool.types.js';
import { WorkflowActionExecutor } from './workflow-action.executor.js';
import type { WorkflowContextBuilder } from './workflow-context.builder.js';
import type { LoadedWorkflow } from './workflow-context.builder.js';
import { MAX_ACTIONS_PER_RUN, WorkflowRuntimeService } from './workflow-runtime.service.js';

const now = new Date();
const baseWorkflow = {
  id: 'session-1',
  title: '准备面试',
  userGoal: '准备前端面试',
  status: 'running',
  context: {},
  currentStepId: null,
  finalOutput: null,
  createdAt: now,
  updatedAt: now,
  messages: [],
  steps: [],
  actions: [],
} as LoadedWorkflow;

function decision(action: WorkflowDecision['action'], shouldContinue = false) {
  return JSON.stringify({
    action,
    reasoningSummary: `选择 ${action}`,
    messageToUser: '',
    toolInput: {},
    shouldContinue,
  });
}

function makeRuntime(rawDecision: string, result = { message: '', output: {}, shouldStop: false }) {
  const completeText = vi.fn().mockResolvedValue(rawDecision);
  const createAction = vi.fn().mockResolvedValue({ id: 'action-1' });
  const updateAction = vi.fn().mockResolvedValue({});
  const createMessage = vi.fn().mockResolvedValue({});
  const prisma = {
    agentAction: { create: createAction, update: updateAction },
    workflowMessage: { create: createMessage },
    workflowSession: { update: vi.fn().mockResolvedValue({}) },
  };
  const contextBuilder = {
    load: vi.fn().mockResolvedValue(baseWorkflow),
    build: vi.fn().mockReturnValue({ session: {}, messages: [], steps: [], recentActions: [] }),
  };
  const executor = { execute: vi.fn().mockResolvedValue(result) };
  const runtime = new WorkflowRuntimeService(
    { completeText } as unknown as AiService,
    prisma as unknown as PrismaService,
    contextBuilder as unknown as WorkflowContextBuilder,
    executor as unknown as WorkflowActionExecutor,
  );
  return { runtime, completeText, createAction, executor };
}

describe('WorkflowRuntimeService', () => {
  it('records ask_user when a vague goal needs clarification', async () => {
    const { runtime, createAction, executor } = makeRuntime(decision('ask_user'), {
      message: '你有多少准备时间？',
      output: { questions: ['你有多少准备时间？'] },
      shouldStop: true,
    });

    await runtime.run('session-1');

    expect(createAction).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'ask_user' }) }),
    );
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it('records create_plan when enough information exists and no steps exist', async () => {
    const { runtime, createAction } = makeRuntime(decision('create_plan'));
    await runtime.run('session-1');
    expect(createAction).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'create_plan' }) }),
    );
  });

  it('never executes more than three actions in one run', async () => {
    const { runtime, completeText, executor } = makeRuntime(decision('execute_step', true));
    await runtime.run('session-1');
    expect(completeText).toHaveBeenCalledTimes(MAX_ACTIONS_PER_RUN);
    expect(executor.execute).toHaveBeenCalledTimes(MAX_ACTIONS_PER_RUN);
  });
});

describe('WorkflowActionExecutor finalize', () => {
  it('writes finalOutput and completes the session', async () => {
    const update = vi.fn().mockResolvedValue({});
    const executor = new WorkflowActionExecutor(
      { completeText: vi.fn().mockResolvedValue('# 最终结果') } as unknown as AiService,
      { workflowSession: { update } } as unknown as PrismaService,
    );
    const result = await executor.execute(baseWorkflow, {
      action: 'finalize',
      reasoningSummary: '所有步骤已经完成',
      messageToUser: '',
      toolInput: {},
      shouldContinue: false,
    });

    expect(result.message).toBe('# 最终结果');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'completed', currentStepId: null, finalOutput: '# 最终结果' },
    });
  });
});
