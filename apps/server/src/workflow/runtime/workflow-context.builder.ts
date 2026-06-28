import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type LoadedWorkflow = NonNullable<Awaited<ReturnType<WorkflowContextBuilder['load']>>>;

export interface WorkflowContext {
  session: {
    userGoal: string;
    status: string;
    context: unknown;
    currentStepId: string | null;
    finalOutput: string | null;
  };
  messages: Array<{ role: string; content: string; createdAt: Date }>;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    order: number;
    result: string | null;
  }>;
  recentActions: Array<{
    type: string;
    reasoningSummary: string;
    status: string;
    output: unknown;
    createdAt: Date;
  }>;
}

@Injectable()
export class WorkflowContextBuilder {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  load(sessionId: string) {
    return this.prisma.workflowSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
        actions: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  build(workflow: LoadedWorkflow): WorkflowContext {
    return {
      session: {
        userGoal: workflow.userGoal,
        status: workflow.status,
        context: workflow.context,
        currentStepId: workflow.currentStepId,
        finalOutput: workflow.finalOutput,
      },
      messages: workflow.messages.slice(-20).map(({ role, content, createdAt }) => ({
        role,
        content,
        createdAt,
      })),
      steps: workflow.steps.map(({ id, title, description, status, order, result }) => ({
        id,
        title,
        description,
        status,
        order,
        result,
      })),
      recentActions: workflow.actions
        .slice(-10)
        .map(({ type, reasoningSummary, status, output, createdAt }) => ({
          type,
          reasoningSummary,
          status,
          output,
          createdAt,
        })),
    };
  }

  async buildForSession(sessionId: string) {
    const workflow = await this.load(sessionId);
    return workflow ? this.build(workflow) : null;
  }
}
