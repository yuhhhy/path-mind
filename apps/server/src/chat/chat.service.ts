import { Inject, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import type { ChatSessionDto } from './dto/chat-session.dto.js';
import { buildChatCoachPrompt } from './prompts/chat-coach.prompt.js';

@Injectable()
export class ChatService {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  streamSession(input: ChatSessionDto, signal?: AbortSignal) {
    const systemPrompt = buildChatCoachPrompt(input);
    return this.aiService.streamCoachReply(systemPrompt, input.messages, signal);
  }
}
