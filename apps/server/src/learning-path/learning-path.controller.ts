import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { generateLearningPathSchema } from './dto/generate-learning-path.dto.js';
import { LearningPathService } from './learning-path.service.js';

@Controller('learning-path')
export class LearningPathController {
  constructor(
    @Inject(LearningPathService) private readonly learningPathService: LearningPathService,
  ) {}

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
