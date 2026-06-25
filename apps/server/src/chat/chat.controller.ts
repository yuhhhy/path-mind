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
import { formatSseEvent } from '../common/sse/sse.utils.js';
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
    let assistantContent = '';

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
      for await (const content of this.chatService.streamSession(
        input,
        prepared.messages,
        abortController.signal,
      )) {
        if (closed) {
          return;
        }
        assistantContent = appendMessageDelta(assistantContent, content);
        res.write(formatSseEvent({ type: 'delta', content }));
      }

      if (!closed) {
        await this.chatService.saveAssistantMessage(prepared.sessionId, assistantContent);
        res.write(formatSseEvent({ type: 'done' }));
        res.end();
      }
    } catch (error) {
      if (!closed) {
        const message = error instanceof Error ? error.message : 'AI 服务暂时不可用。';
        res.write(formatSseEvent({ type: 'error', message }));
        res.end();
      }
    }
  }
}
