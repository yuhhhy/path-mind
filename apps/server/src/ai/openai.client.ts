import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { getAiProviderConfig } from './provider-config.js';

export const AI_CLIENT = Symbol('AI_CLIENT');

export const OpenAiClientProvider = {
  provide: AI_CLIENT,
  inject: [ConfigService],
  useFactory(config: ConfigService) {
    const providerConfig = getAiProviderConfig(config);

    return new OpenAI({
      apiKey: providerConfig.apiKey || 'missing-api-key',
      baseURL: providerConfig.baseURL,
    });
  },
};
