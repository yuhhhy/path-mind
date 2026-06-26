import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  generateQuizSchema,
  generateSummarySchema,
  generateTransferSchema,
  submitQuizAttemptSchema,
  submitTransferSchema,
} from './dto/verification.dto.js';
import { VerificationService } from './verification.service.js';

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
    try {
      return this.verificationService.generateQuiz(stepId, generateQuizSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 GenerateQuizInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  @Post('quizzes/:quizId/attempt')
  submitQuizAttempt(@Param('quizId') quizId: string, @Body() body: unknown) {
    try {
      return this.verificationService.submitQuizAttempt(
        quizId,
        submitQuizAttemptSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 SubmitQuizAttemptInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  @Post('steps/:stepId/transfer/generate')
  generateTransfer(@Param('stepId') stepId: string, @Body() body: unknown) {
    try {
      return this.verificationService.generateTransfer(stepId, generateTransferSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 GenerateTransferInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  @Post('steps/:stepId/transfer/submit')
  submitTransfer(@Param('stepId') stepId: string, @Body() body: unknown) {
    try {
      return this.verificationService.submitTransfer(stepId, submitTransferSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 SubmitTransferInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  @Post('steps/:stepId/summary/generate')
  generateSummary(@Param('stepId') stepId: string, @Body() body: unknown) {
    try {
      return this.verificationService.generateSummary(stepId, generateSummarySchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 GenerateSummaryInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }
}
