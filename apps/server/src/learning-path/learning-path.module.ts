import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LearningPathController } from './learning-path.controller.js';
import { LearningPathService } from './learning-path.service.js';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [LearningPathController],
  providers: [LearningPathService],
})
export class LearningPathModule {}
