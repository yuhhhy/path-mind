import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWorkflowSessionDto } from './dto/create-workflow-session.dto.js';
import type { SendWorkflowMessageDto } from './dto/send-workflow-message.dto.js';
import { WorkflowRuntimeService } from './runtime/workflow-runtime.service.js';

interface WorkflowSessionContext {
  userInputs: string[];
  lastUserMessage: string;
  [key: string]: unknown;
}

@Injectable()
export class WorkflowService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkflowRuntimeService) private readonly runtime: WorkflowRuntimeService,
  ) {}

  async create(input: CreateWorkflowSessionDto) {
    const goal = input.userGoal.trim();
    const session = await this.prisma.workflowSession.create({
      data: {
        title: this.createTitle(goal),
        userGoal: goal,
        status: 'clarifying',
        context: { userInputs: [goal], lastUserMessage: goal },
        messages: { create: { role: 'user', content: goal } },
      },
    });
    return this.runtime.run(session.id);
  }

  findOne(sessionId: string) {
    return this.runtime.getRunResult(sessionId);
  }

  async findAll() {
    return this.prisma.workflowSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        userGoal: true,
        status: true,
        currentStepId: true,
        finalOutput: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true, steps: true, actions: true } },
      },
    });
  }

  async sendMessage(sessionId: string, input: SendWorkflowMessageDto) {
    const session = await this.prisma.workflowSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('没有找到这个 Workflow Session。');
    if (session.status === 'completed') {
      throw new ConflictException('这个 Workflow 已经完成，请创建新的 Session。');
    }

    const context = this.readContext(session.context);
    const content = input.content.trim();
    const resumedStatus =
      session.status === 'failed' || session.status === 'waiting_user' ? 'running' : session.status;
    await this.prisma.$transaction([
      this.prisma.workflowMessage.create({
        data: { sessionId, role: 'user', content },
      }),
      this.prisma.workflowSession.update({
        where: { id: sessionId },
        data: {
          status: resumedStatus,
          context: {
            ...context,
            userInputs: [...context.userInputs, content].slice(-20),
            lastUserMessage: content,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
    return this.runtime.run(sessionId);
  }

  private readContext(value: Prisma.JsonValue | null): WorkflowSessionContext {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const raw = value as Record<string, Prisma.JsonValue>;
      return {
        ...raw,
        userInputs: Array.isArray(raw.userInputs)
          ? raw.userInputs.filter((item): item is string => typeof item === 'string')
          : [],
        lastUserMessage: typeof raw.lastUserMessage === 'string' ? raw.lastUserMessage : '',
      };
    }
    return { userInputs: [], lastUserMessage: '' };
  }

  private createTitle(goal: string) {
    return goal.length > 36 ? `${goal.slice(0, 36)}…` : goal;
  }
}
