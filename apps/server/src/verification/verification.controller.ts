import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { ZodType } from 'zod';
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

  @Post('steps/:stepId/transfer/submit')
  submitTransfer(@Param('stepId') stepId: string, @Body() body: unknown) {
    return this.verificationService.submitTransfer(
      stepId,
      parseBody(submitTransferSchema, body, 'SubmitTransferInput'),
    );
  }

  @Post('steps/:stepId/summary/generate')
  generateSummary(@Param('stepId') stepId: string, @Body() body: unknown) {
    return this.verificationService.generateSummary(
      stepId,
      parseBody(generateSummarySchema, body, 'GenerateSummaryInput'),
    );
  }
}
