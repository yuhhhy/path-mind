import { Inject, Injectable } from '@nestjs/common';
import type { ChatMessage } from '@pathmind/shared';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChatSessionDto } from './dto/chat-session.dto.js';
import { buildChatCoachPrompt } from './prompts/chat-coach.prompt.js';

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
      messages: session.messages.map((message) => ({
        role: message.role as ChatMessage['role'],
        content: message.content,
      })),
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

    if (input.userMessage) {
      await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: input.userMessage,
        },
      });
      messages = [...input.messages, { role: 'user', content: input.userMessage }];
    }

    return {
      sessionId: session.id,
      messages,
    };
  }

  async saveAssistantMessage(sessionId: string, content: string) {
    if (!content.trim()) {
      return;
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content,
      },
    });
  }

  streamSession(input: ChatSessionDto, messages: ChatMessage[], signal?: AbortSignal) {
    const systemPrompt = buildChatCoachPrompt(input);
    return this.aiService.streamCoachReply(systemPrompt, messages, signal);
  }
}
