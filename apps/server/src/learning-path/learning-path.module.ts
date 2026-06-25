import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { LearningPathController } from './learning-path.controller.js';
import { LearningPathService } from './learning-path.service.js';

@Module({
  imports: [AiModule],
  controllers: [LearningPathController],
  providers: [LearningPathService],
})
export class LearningPathModule {}
