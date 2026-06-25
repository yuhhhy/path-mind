import { Module } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { OpenAiClientProvider } from './openai.client.js';

@Module({
  providers: [OpenAiClientProvider, AiService],
  exports: [AiService],
})
export class AiModule {}
