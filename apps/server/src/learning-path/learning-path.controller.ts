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
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodError } from 'zod';
import { GenerateLearningPathInputDto, GenerateLearningPathOutputDto } from '../openapi/dtos.js';
import { generateLearningPathSchema } from './dto/generate-learning-path.dto.js';
import { LearningPathService } from './learning-path.service.js';

@ApiTags('learning-path')
@Controller('learning-path')
export class LearningPathController {
  constructor(
    @Inject(LearningPathService) private readonly learningPathService: LearningPathService,
  ) {}

  @ApiOperation({ summary: 'Generate a structured learning path with the configured LLM' })
  @ApiBody({ type: GenerateLearningPathInputDto })
  @ApiOkResponse({ type: GenerateLearningPathOutputDto })
  @Post('generate')
  generate(@Body() body: unknown) {
    try {
      return this.learningPathService.generate(generateLearningPathSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 GenerateLearningPathInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Create a placeholder goal and return its ID immediately' })
  @ApiBody({ type: GenerateLearningPathInputDto })
  @ApiOkResponse({ schema: { properties: { goalId: { type: 'string' } } } })
  @Post('init')
  init(@Body() body: unknown) {
    try {
      return this.learningPathService.initGoal(generateLearningPathSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 GenerateLearningPathInput。',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Stream AI-generated steps for a goal over SSE and pre-generate initial chat',
  })
  @Get(':goalId/stream')
  stream(@Param('goalId') goalId: string, @Req() req: IncomingMessage, @Res() res: ServerResponse) {
    return this.learningPathService.streamSteps(goalId, req, res);
  }
}
