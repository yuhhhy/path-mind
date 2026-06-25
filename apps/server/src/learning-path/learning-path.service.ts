import { Inject, Injectable } from '@nestjs/common';
import type { GenerateLearningPathOutput } from '@pathmind/shared';
import { AiService } from '../ai/ai.service.js';
import type { GenerateLearningPathDto } from './dto/generate-learning-path.dto.js';
import { buildLearningPathPrompt } from './prompts/learning-path.prompt.js';

@Injectable()
export class LearningPathService {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  async generate(input: GenerateLearningPathDto): Promise<GenerateLearningPathOutput> {
    return this.aiService.generateLearningPath(buildLearningPathPrompt(input));
  }
}
