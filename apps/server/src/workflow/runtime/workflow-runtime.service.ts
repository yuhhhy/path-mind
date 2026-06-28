import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AiService } from '../../ai/ai.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  WORKFLOW_AGENT_SYSTEM_PROMPT,
  buildWorkflowAgentPrompt,
} from '../prompts/workflow-agent.prompt.js';
import type { WorkflowDecision } from '../tools/workflow-tool.types.js';
import { parseWorkflowDecision } from '../utils/parse-workflow-decision.js';
import { WorkflowActionExecutor } from './workflow-action.executor.js';
import { WorkflowContextBuilder } from './workflow-context.builder.js';

export const MAX_ACTIONS_PER_RUN = 3;

@Injectable()
export class WorkflowRuntimeService {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkflowContextBuilder) private readonly contextBuilder: WorkflowContextBuilder,
    @Inject(WorkflowActionExecutor) private readonly actionExecutor: WorkflowActionExecutor,
  ) {}

  async run(sessionId: string) {
    for (let actionCount = 0; actionCount < MAX_ACTIONS_PER_RUN; actionCount++) {
      const workflow = await this.contextBuilder.load(sessionId);
      if (!workflow) throw new NotFoundException('没有找到这个 Workflow Session。');
      if (workflow.status === 'completed') break;

      let decision: WorkflowDecision;
      try {
        const rawDecision = await this.aiService.completeText(
          WORKFLOW_AGENT_SYSTEM_PROMPT,
          buildWorkflowAgentPrompt(this.contextBuilder.build(workflow)),
          { temperature: 0.1 },
        );
        decision = parseWorkflowDecision(rawDecision);
      } catch (error) {
        await this.prisma.workflowSession.update({
          where: { id: sessionId },
          data: { status: 'failed' },
        });
        throw error;
      }
      const currentStep =
        workflow.steps.find((step) => step.id === workflow.currentStepId) ??
        workflow.steps.find((step) => step.status === 'todo' || step.status === 'running');

      const action = await this.prisma.agentAction.create({
        data: {
          sessionId,
          stepId: currentStep?.id,
          type: decision.action,
          reasoningSummary: decision.reasoningSummary,
          input: decision.toolInput as Prisma.InputJsonValue,
          status: 'running',
        },
      });

      try {
        const result = await this.actionExecutor.execute(workflow, decision);
        await this.prisma.agentAction.update({
          where: { id: action.id },
          data: { status: 'done', output: result.output as Prisma.InputJsonValue },
        });
        if (result.message.trim()) {
          await this.prisma.workflowMessage.create({
            data: { sessionId, role: 'assistant', content: result.message },
          });
        }
        if (result.shouldStop || !decision.shouldContinue) break;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Workflow action 执行失败。';
        await this.prisma.agentAction.update({
          where: { id: action.id },
          data: { status: 'failed', output: { error: message } },
        });
        await this.prisma.workflowSession.update({
          where: { id: sessionId },
          data: { status: 'failed' },
        });
        throw error;
      }
    }

    return this.getRunResult(sessionId);
  }

  async getRunResult(sessionId: string) {
    const workflow = await this.contextBuilder.load(sessionId);
    if (!workflow) throw new NotFoundException('没有找到这个 Workflow Session。');
    const { messages, steps, actions, ...session } = workflow;
    return { session, messages, steps, actions };
  }
}
