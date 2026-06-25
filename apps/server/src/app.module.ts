import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module.js';
import { AppController } from './app.controller.js';
import { ChatModule } from './chat/chat.module.js';
import { envSchema } from './config/env.js';
import { LearningPathModule } from './learning-path/learning-path.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate(config) {
        return envSchema.parse(config);
      },
    }),
    AiModule,
    LearningPathModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
