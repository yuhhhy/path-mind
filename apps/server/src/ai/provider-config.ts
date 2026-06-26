import type { ConfigService } from '@nestjs/config';

export type AiProvider = 'openai' | 'deepseek';

export interface AiProviderConfig {
  provider: AiProvider;
  apiKey?: string;
  baseURL?: string;
  model: string;
  missingKeyMessage: string;
}

export function getAiProviderConfig(config: ConfigService): AiProviderConfig {
  const openAiKey = config.get<string>('OPENAI_API_KEY');
  const deepSeekKey = config.get<string>('DEEPSEEK_API_KEY');

  // Prefer OpenAI if its key is present (or if neither key is set — missing key
  // is surfaced later by checkedModel when an actual AI call is made).
  if (openAiKey || !deepSeekKey) {
    return {
      provider: 'openai',
      apiKey: openAiKey,
      baseURL: config.get<string>('OPENAI_BASE_URL'),
      model: config.get<string>('OPENAI_MODEL') || 'gpt-4.1-mini',
      missingKeyMessage: '缺少 OPENAI_API_KEY，请在 apps/server/.env 中配置后重试。',
    };
  }

  return {
    provider: 'deepseek',
    apiKey: deepSeekKey,
    baseURL: config.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com',
    model: config.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat',
    missingKeyMessage: '缺少 DEEPSEEK_API_KEY，请在 apps/server/.env 中配置后重试。',
  };
}
