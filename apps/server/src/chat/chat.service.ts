import { Inject, Injectable } from '@nestjs/common';
import type { ChatMessage } from '@pathmind/shared';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChatSessionDto } from './dto/chat-session.dto.js';
import { buildChatCoachPrompt } from './prompts/chat-coach.prompt.js';

const DEV_USER_ID = 'local-dev-user';

function isAutoStartMessage(content: string) {
  return /^请开始当前 Step「.+」的教学。$/.test(content);
}

export type TeachingGenerationStatus = 'queued' | 'running' | 'done';

export interface TeachingGenerationStatusItem {
  stepId: string;
  status: TeachingGenerationStatus;
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getSession(goalId: string, stepId: string): Promise<{ messages: ChatMessage[] }> {
    const session = await this.prisma.chatSession.findUnique({
      where: { stepId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session || session.goalId !== goalId) {
      return { messages: [] };
    }

    return {
      messages: session.messages
        .filter((message) => !(message.role === 'user' && isAutoStartMessage(message.content)))
        .map((message) => ({
          id: message.id,
          role: message.role as ChatMessage['role'],
          content: message.content,
          status: message.status as ChatMessage['status'],
        })),
    };
  }

  async getTeachingStatuses(goalId: string): Promise<{ steps: TeachingGenerationStatusItem[] }> {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId, devUserId: DEV_USER_ID },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            chatSession: {
              include: { messages: { orderBy: { createdAt: 'desc' } } },
            },
          },
        },
      },
    });

    if (!goal) {
      return { steps: [] };
    }

    return {
      steps: goal.steps.map((step) => {
        const assistantMessage = step.chatSession?.messages.find(
          (message) => message.role === 'assistant',
        );
        const status: TeachingGenerationStatus =
          assistantMessage?.status === 'complete'
            ? 'done'
            : assistantMessage?.status === 'streaming'
              ? 'running'
              : 'queued';

        return { stepId: step.id, status };
      }),
    };
  }

  async prepareSession(input: ChatSessionDto) {
    const session = await this.prisma.chatSession.upsert({
      where: { stepId: input.step.id },
      create: {
        goalId: input.goal.id,
        stepId: input.step.id,
      },
      update: {
        goalId: input.goal.id,
      },
    });

    let messages = input.messages;
    let assistantMessageId = '';
    let initialAssistantContent = '';

    if (input.continueAssistantMessageId) {
      const existingAssistantMessage = await this.prisma.chatMessage.findFirst({
        where: {
          id: input.continueAssistantMessageId,
          sessionId: session.id,
          role: 'assistant',
          status: 'streaming',
        },
      });

      if (existingAssistantMessage) {
        assistantMessageId = existingAssistantMessage.id;
        initialAssistantContent = existingAssistantMessage.content;
        messages = [
          ...input.messages.filter((message) => message.id !== existingAssistantMessage.id),
          {
            role: 'user' as const,
            content: `请继续当前 Step 的教学。你已经生成到这里：\n\n${existingAssistantMessage.content}\n\n请从中断处继续，不要重复已经写过的内容。`,
          },
        ];
      }
    }

    if (input.userMessage) {
      await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: input.userMessage,
          status: 'complete',
        },
      });
      messages = [...input.messages, { role: 'user', content: input.userMessage }];
    } else if (input.silentUserMessage) {
      messages = [...input.messages, { role: 'user', content: input.silentUserMessage }];
    }

    return {
      assistantMessageId,
      initialAssistantContent,
      sessionId: session.id,
      messages,
    };
  }

  async createAssistantDraft(sessionId: string, initialContent = '') {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: initialContent,
        status: 'streaming',
      },
      select: { id: true, content: true },
    });
  }

  async updateAssistantDraft(messageId: string, content: string) {
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, status: 'streaming' },
    });
  }

  async completeAssistantMessage(messageId: string, content: string) {
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, status: 'complete' },
    });
  }

  streamSession(input: ChatSessionDto, messages: ChatMessage[], signal?: AbortSignal) {
    const systemPrompt = buildChatCoachPrompt(input);
    return this.aiService.streamCoachReply(systemPrompt, messages, signal);
  }
}
