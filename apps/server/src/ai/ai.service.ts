import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatMessage, GenerateLearningPathOutput } from '@pathmind/shared';
import type { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { AI_CLIENT } from './openai.client.js';
import { getAiProviderConfig } from './provider-config.js';

const generatedStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});

const learningPathOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  finalOutcome: z.array(z.string().min(1)).min(1),
  steps: z.array(generatedStepSchema).min(4).max(7),
});

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_CLIENT) private readonly openai: OpenAI,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  async generateLearningPath(prompt: string): Promise<GenerateLearningPathOutput> {
    this.ensureApiKey();

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You generate strict JSON only. Do not include Markdown fences or prose.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new BadGatewayException('LLM 没有返回可解析的学习路径内容。');
    }

    return this.parseLearningPath(content);
  }

  async *streamCoachReply(
    systemPrompt: string,
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    this.ensureApiKey();

    const normalizedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const stream = await this.openai.chat.completions.create(
      {
        model: this.model,
        temperature: 0.5,
        stream: true,
        messages: normalizedMessages,
      },
      { signal },
    );

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta.content;
      if (content) {
        yield content;
      }
    }
  }

  private get model() {
    return getAiProviderConfig(this.config).model;
  }

  private ensureApiKey() {
    const providerConfig = getAiProviderConfig(this.config);

    if (!providerConfig.apiKey) {
      throw new ServiceUnavailableException(providerConfig.missingKeyMessage);
    }
  }

  private parseLearningPath(content: string): GenerateLearningPathOutput {
    const trimmed = content.trim();
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(withoutFence);
      return learningPathOutputSchema.parse(parsed);
    } catch (error) {
      throw new BadGatewayException({
        message: 'LLM 返回了不合法的学习路径 JSON。',
        detail: error instanceof Error ? error.message : 'Unknown parse error',
      });
    }
  }
}
