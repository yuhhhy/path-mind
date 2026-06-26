import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { ZodType } from 'zod';
import { writeSse } from '../common/sse/sse.utils.js';
import {
  generateQuizSchema,
  generateSummarySchema,
  generateTransferSchema,
  submitQuizAttemptSchema,
  submitTransferSchema,
} from './dto/verification.dto.js';
import { VerificationService } from './verification.service.js';

function parseBody<T>(schema: ZodType<T>, body: unknown, inputName: string): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      message: `请求体不符合 ${inputName}。`,
      issues: result.error.issues,
    });
  }
  return result.data;
}

async function writeVerificationStream(
  req: IncomingMessage,
  res: ServerResponse,
  stream: () => AsyncGenerator<
    | { type: 'delta'; content: string }
    | { type: 'state'; data: unknown }
    | { type: 'done'; data: unknown }
  >,
) {
  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    for await (const event of stream()) {
      if (!closed) writeSse(res, event);
    }
    if (!closed) res.end();
  } catch (error) {
    if (!closed) {
      const message = error instanceof Error ? error.message : 'AI 服务暂时不可用。';
      writeSse(res, { type: 'error', message });
      res.end();
    }
  }
}

@Controller()
export class VerificationController {
  constructor(
    @Inject(VerificationService) private readonly verificationService: VerificationService,
  ) {}

  @Get('steps/:stepId/verification')
  getVerification(@Param('stepId') stepId: string) {
    return this.verificationService.getVerification(stepId);
  }

  @Post('steps/:stepId/quiz/generate')
  generateQuiz(@Param('stepId') stepId: string, @Body() body: unknown) {
    return this.verificationService.generateQuiz(
      stepId,
      parseBody(generateQuizSchema, body, 'GenerateQuizInput'),
    );
  }

  @Post('steps/:stepId/quiz/generate/stream')
  streamQuiz(
    @Param('stepId') stepId: string,
    @Body() body: unknown,
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
  ) {
    const input = parseBody(generateQuizSchema, body, 'GenerateQuizInput');
    return writeVerificationStream(req, res, () =>
      this.verificationService.streamQuiz(stepId, input),
    );
  }

  @Post('quizzes/:quizId/attempt')
  submitQuizAttempt(@Param('quizId') quizId: string, @Body() body: unknown) {
    return this.verificationService.submitQuizAttempt(
      quizId,
      parseBody(submitQuizAttemptSchema, body, 'SubmitQuizAttemptInput'),
    );
  }

  @Post('steps/:stepId/transfer/generate')
  generateTransfer(@Param('stepId') stepId: string, @Body() body: unknown) {
    return this.verificationService.generateTransfer(
      stepId,
      parseBody(generateTransferSchema, body, 'GenerateTransferInput'),
    );
  }

  @Post('steps/:stepId/transfer/generate/stream')
  streamTransfer(
    @Param('stepId') stepId: string,
    @Body() body: unknown,
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
  ) {
    const input = parseBody(generateTransferSchema, body, 'GenerateTransferInput');
    return writeVerificationStream(req, res, () =>
      this.verificationService.streamTransfer(stepId, input),
    );
  }

  @Post('steps/:stepId/transfer/submit')
  submitTransfer(@Param('stepId') stepId: string, @Body() body: unknown) {
    return this.verificationService.submitTransfer(
      stepId,
      parseBody(submitTransferSchema, body, 'SubmitTransferInput'),
    );
  }

  @Post('steps/:stepId/transfer/submit/stream')
  streamSubmitTransfer(
    @Param('stepId') stepId: string,
    @Body() body: unknown,
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
  ) {
    const input = parseBody(submitTransferSchema, body, 'SubmitTransferInput');
    return writeVerificationStream(req, res, () =>
      this.verificationService.streamSubmitTransfer(stepId, input),
    );
  }

  @Post('steps/:stepId/summary/generate')
  generateSummary(@Param('stepId') stepId: string, @Body() body: unknown) {
    return this.verificationService.generateSummary(
      stepId,
      parseBody(generateSummarySchema, body, 'GenerateSummaryInput'),
    );
  }

  @Post('steps/:stepId/summary/generate/stream')
  streamSummary(
    @Param('stepId') stepId: string,
    @Body() body: unknown,
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
  ) {
    const input = parseBody(generateSummarySchema, body, 'GenerateSummaryInput');
    return writeVerificationStream(req, res, () =>
      this.verificationService.streamSummary(stepId, input),
    );
  }
}
