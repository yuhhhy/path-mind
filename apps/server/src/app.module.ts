import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module.js';
import { AppController } from './app.controller.js';
import { ChatModule } from './chat/chat.module.js';
import { envSchema } from './config/env.js';
import { GoalsModule } from './goals/goals.module.js';
import { LearningPathModule } from './learning-path/learning-path.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { WorkflowModule } from './workflow/workflow.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate(config) {
        return envSchema.parse(config);
      },
    }),
    AiModule,
    GoalsModule,
    LearningPathModule,
    ChatModule,
    VerificationModule,
    WorkflowModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
