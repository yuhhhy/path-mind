import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { writeSse } from '../common/sse/sse.utils.js';
import {
  ChatSessionInputDto,
  ChatSessionResponseDto,
  SseDeltaEventDto,
  SseDoneEventDto,
  SseErrorEventDto,
} from '../openapi/dtos.js';
import { ChatService } from './chat.service.js';
import { chatSessionSchema } from './dto/chat-session.dto.js';
import { appendMessageDelta } from './utils/message-buffer.js';

@ApiTags('chat')
@ApiExtraModels(SseDeltaEventDto, SseDoneEventDto, SseErrorEventDto)
@Controller('chat')
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Get persisted chat messages for a goal step' })
  @ApiQuery({ name: 'goalId', example: 'cmqtdnd6p0000xcobs2uqh769' })
  @ApiQuery({ name: 'stepId', example: 'cmqtdnd6p0000xcobs2uqh770' })
  @ApiOkResponse({ type: ChatSessionResponseDto })
  @Get('session')
  getSession(@Query('goalId') goalId: string, @Query('stepId') stepId: string) {
    if (!goalId || !stepId) {
      throw new BadRequestException('goalId 和 stepId 是必填参数。');
    }

    return this.chatService.getSession(goalId, stepId);
  }

  @ApiOperation({ summary: 'Get AI teaching generation status for every step in a goal' })
  @ApiQuery({ name: 'goalId', example: 'cmqtdnd6p0000xcobs2uqh769' })
  @Get('teaching-status')
  getTeachingStatus(@Query('goalId') goalId: string) {
    if (!goalId) {
      throw new BadRequestException('goalId 是必填参数。');
    }

    return this.chatService.getTeachingStatuses(goalId);
  }

  @ApiOperation({
    summary: 'Stream an AI teaching reply over SSE and persist the completed messages',
    description:
      'Returns text/event-stream chunks formatted as data: {"type":"delta","content":"..."} followed by data: {"type":"done"}.',
  })
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ChatSessionInputDto })
  @ApiOkResponse({
    description: 'SSE stream of delta, done, or error events.',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/SseDeltaEventDto' },
        { $ref: '#/components/schemas/SseDoneEventDto' },
        { $ref: '#/components/schemas/SseErrorEventDto' },
      ],
    },
  })
  @Post('session')
  async session(@Body() body: unknown, @Req() req: IncomingMessage, @Res() res: ServerResponse) {
    const parsed = chatSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: '请求体不符合 ChatSessionInput。',
        issues: parsed.error.issues,
      });
    }

    const input = parsed.data;
    const prepared = await this.chatService.prepareSession(input);
    const abortController = new AbortController();
    let closed = false;
    let assistantContent = prepared.initialAssistantContent;
    const assistantDraft =
      prepared.assistantMessageId.length > 0
        ? { id: prepared.assistantMessageId, content: prepared.initialAssistantContent }
        : await this.chatService.createAssistantDraft(prepared.sessionId);

    req.on('close', () => {
      closed = true;
      abortController.abort();
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      let draftWriteCounter = 0;
      for await (const content of this.chatService.streamSession(
        input,
        prepared.messages,
        abortController.signal,
      )) {
        if (closed) break;
        assistantContent = appendMessageDelta(assistantContent, content);
        if (++draftWriteCounter % 20 === 0) {
          void this.chatService.updateAssistantDraft(assistantDraft.id, assistantContent);
        }
        writeSse(res, { type: 'delta', content });
      }

      await this.chatService.completeAssistantMessage(assistantDraft.id, assistantContent);
      if (!closed) {
        writeSse(res, { type: 'done' });
        res.end();
      }
    } catch (error) {
      await this.chatService
        .completeAssistantMessage(assistantDraft.id, assistantContent)
        .catch(() => undefined);
      if (!closed) {
        const message = error instanceof Error ? error.message : 'AI 服务暂时不可用。';
        writeSse(res, { type: 'error', message });
        res.end();
      }
    }
  }
}
