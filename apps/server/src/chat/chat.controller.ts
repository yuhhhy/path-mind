import type { IncomingMessage, ServerResponse } from 'node:http';
import { BadRequestException, Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { formatSseEvent } from '../common/sse/sse.utils.js';
import { ChatService } from './chat.service.js';
import { chatSessionSchema } from './dto/chat-session.dto.js';

@Controller('chat')
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

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
    const abortController = new AbortController();
    let closed = false;

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
      for await (const content of this.chatService.streamSession(input, abortController.signal)) {
        if (closed) {
          return;
        }
        res.write(formatSseEvent({ type: 'delta', content }));
      }

      if (!closed) {
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
