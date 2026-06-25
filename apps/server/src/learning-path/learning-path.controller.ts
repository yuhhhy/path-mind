import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
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
}
