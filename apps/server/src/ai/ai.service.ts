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
import type { z } from 'zod';
import {
  learningPathOutputSchema,
  openAnswerGradingSchema,
  quizGenerationSchema,
  stepSummarySchema,
  streamStepSchema,
  transferGradingSchema,
  transferGenerationSchema,
} from './ai.schemas.js';
import type {
  OpenAnswerGrading,
  QuizGeneration,
  StepSummaryGeneration,
  TransferGeneration,
  TransferGrading,
} from './ai.schemas.js';
import { AI_CLIENT } from './openai.client.js';
import { getAiProviderConfig } from './provider-config.js';

export type {
  OpenAnswerGrading,
  QuizGeneration,
  StepSummaryGeneration,
  TransferGeneration,
  TransferGrading,
} from './ai.schemas.js';

export type StreamedPathEvent =
  | {
      type: 'metadata';
      title: string;
      description: string;
      estimatedMinutes: number;
      finalOutcome: string[];
    }
  | { type: 'step'; title: string; description: string; estimatedMinutes: number };

export function findStepsArrayStart(
  content: string,
): { propertyStart: number; arrayBodyStart: number } | null {
  let inString = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (c === '\\') {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c !== '"') continue;

    const propertyStart = i;
    let key = '';
    i++;

    for (; i < content.length; i++) {
      const keyChar = content[i];
      if (escaped) {
        key += keyChar;
        escaped = false;
        continue;
      }
      if (keyChar === '\\') {
        escaped = true;
        continue;
      }
      if (keyChar === '"') break;
      key += keyChar;
    }

    if (content[i] !== '"') return null;
    escaped = false;

    if (key !== 'steps') continue;

    let cursor = i + 1;
    while (/\s/.test(content[cursor] ?? '')) cursor++;
    if (content[cursor] !== ':') continue;
    cursor++;
    while (/\s/.test(content[cursor] ?? '')) cursor++;
    if (content[cursor] !== '[') continue;

    return { propertyStart, arrayBodyStart: cursor + 1 };
  }

  return null;
}

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_CLIENT) private readonly openai: OpenAI,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  async generateLearningPath(prompt: string): Promise<GenerateLearningPathOutput> {
    const completion = await this.openai.chat.completions.create({
      model: this.checkedModel,
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

  async completeText(
    systemPrompt: string,
    userPrompt: string,
    options: { temperature?: number } = {},
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: this.checkedModel,
      temperature: options.temperature ?? 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message.content?.trim();
    if (!content) {
      throw new BadGatewayException('LLM 没有返回内容。');
    }
    return content;
  }

  async generateQuiz(prompt: string): Promise<QuizGeneration> {
    return this.generateStrictJson(prompt, quizGenerationSchema, '测验题目');
  }

  async gradeOpenAnswer(prompt: string): Promise<OpenAnswerGrading> {
    return this.generateStrictJson(prompt, openAnswerGradingSchema, '开放题批改');
  }

  async generateTransfer(prompt: string): Promise<TransferGeneration> {
    return this.generateStrictJson(prompt, transferGenerationSchema, '迁移应用题');
  }

  async gradeTransfer(prompt: string): Promise<TransferGrading> {
    return this.generateStrictJson(prompt, transferGradingSchema, '迁移应用批改');
  }

  async generateStepSummary(prompt: string): Promise<StepSummaryGeneration> {
    return this.generateStrictJson(prompt, stepSummarySchema, '学习总结');
  }

  async *streamStrictJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    label: string,
    continuation?: string,
    signal?: AbortSignal,
  ): AsyncGenerator<{ type: 'delta'; content: string } | { type: 'done'; parsed: T }> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You generate strict JSON only. Do not include Markdown fences or prose.',
      },
      { role: 'user', content: prompt },
    ];

    if (continuation?.trim()) {
      messages.push({
        role: 'user',
        content: [
          `你之前已经生成到这里：`,
          continuation,
          '请从中断处继续，只输出剩余 JSON 内容，不要重复已经生成过的内容。',
        ].join('\n\n'),
      });
    }

    const stream = await this.openai.chat.completions.create(
      {
        model: this.checkedModel,
        temperature: 0.3,
        stream: true,
        messages,
      },
      { signal },
    );

    let full = continuation ?? '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta.content;
      if (!content) continue;
      full += content;
      yield { type: 'delta', content };
    }

    try {
      yield { type: 'done', parsed: schema.parse(JSON.parse(stripJsonFence(full))) };
    } catch (error) {
      throw new BadGatewayException({
        message: `LLM 返回了不合法的${label} JSON。`,
        detail: error instanceof Error ? error.message : 'Unknown parse error',
      });
    }
  }

  streamQuiz(prompt: string, continuation?: string, signal?: AbortSignal) {
    return this.streamStrictJson(prompt, quizGenerationSchema, '测验题目', continuation, signal);
  }

  streamTransfer(prompt: string, continuation?: string, signal?: AbortSignal) {
    return this.streamStrictJson(
      prompt,
      transferGenerationSchema,
      '迁移应用题',
      continuation,
      signal,
    );
  }

  streamTransferGrading(prompt: string, continuation?: string, signal?: AbortSignal) {
    return this.streamStrictJson(
      prompt,
      transferGradingSchema,
      '迁移应用批改',
      continuation,
      signal,
    );
  }

  streamStepSummary(prompt: string, continuation?: string, signal?: AbortSignal) {
    return this.streamStrictJson(prompt, stepSummarySchema, '学习总结', continuation, signal);
  }

  /**
   * Streams the learning path AI response and yields events as each piece
   * of structured data becomes available in the stream.
   *
   * Emits a `metadata` event once the AI has generated the header fields
   * (title, description, estimatedMinutes, finalOutcome). Then emits a
   * `step` event for every step object the moment its closing `}` arrives
   * in the stream — no need to wait for the full JSON response.
   */
  async *streamLearningPathEvents(
    prompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamedPathEvent> {
    const stream = await this.openai.chat.completions.create(
      {
        model: this.checkedModel,
        temperature: 0.4,
        stream: true,
        messages: [
          {
            role: 'system',
            content: 'You generate strict JSON only. Do not include Markdown fences or prose.',
          },
          { role: 'user', content: prompt },
        ],
      },
      { signal },
    );

    let full = '';
    let stepsBodyStart = -1; // index in `full` where content after "steps":[ begins
    let scanFrom = 0;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let stepStart = -1;
    let metadataEmitted = false;
    let emittedSteps = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta.content;
      if (!delta) continue;

      full += delta;

      if (stepsBodyStart === -1) {
        const stepsArray = findStepsArrayStart(full);
        if (!stepsArray) continue;

        stepsBodyStart = stepsArray.arrayBodyStart;
        scanFrom = stepsBodyStart;

        if (!metadataEmitted) {
          // Build a parseable snippet with just the header fields
          const metaSnippet = full.slice(0, stepsArray.propertyStart) + '"steps":[]}';
          try {
            const obj = JSON.parse(stripJsonFence(metaSnippet)) as {
              title?: string;
              description?: string;
              estimatedMinutes?: number;
              finalOutcome?: string[];
            };
            if (obj.title) {
              yield {
                type: 'metadata',
                title: obj.title,
                description: obj.description ?? '',
                estimatedMinutes: obj.estimatedMinutes ?? 0,
                finalOutcome: obj.finalOutcome ?? [],
              };
              metadataEmitted = true;
            }
          } catch {
            // Snippet not parseable yet — will retry on next chunk
          }
        }
      }

      // Scan the new characters in the steps section, tracking JSON depth
      for (let i = scanFrom; i < full.length; i++) {
        const c = full[i];

        if (escaped) {
          escaped = false;
          continue;
        }
        if (inString) {
          if (c === '\\') escaped = true;
          else if (c === '"') inString = false;
          continue;
        }
        if (c === '"') {
          inString = true;
          continue;
        }
        if (c === '{') {
          if (depth === 0) stepStart = i;
          depth++;
        } else if (c === '}') {
          depth--;
          if (depth === 0 && stepStart !== -1) {
            const stepJson = full.slice(stepStart, i + 1);
            try {
              const raw = JSON.parse(stepJson) as unknown;
              const step = streamStepSchema.parse(raw);
              yield {
                type: 'step',
                title: step.title,
                description: step.description,
                estimatedMinutes: step.estimatedMinutes,
              };
              emittedSteps++;
            } catch {
              // Malformed step — skip
            }
            stepStart = -1;
          }
        }
      }

      scanFrom = full.length;
    }

    if (emittedSteps === 0) {
      const parsed = this.parseLearningPath(full);
      if (!metadataEmitted) {
        yield {
          type: 'metadata',
          title: parsed.title,
          description: parsed.description,
          estimatedMinutes: parsed.estimatedMinutes,
          finalOutcome: parsed.finalOutcome,
        };
      }
      for (const step of parsed.steps) {
        yield {
          type: 'step',
          title: step.title,
          description: step.description,
          estimatedMinutes: step.estimatedMinutes,
        };
      }
    }
  }

  async *streamCoachReply(
    systemPrompt: string,
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const normalizedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const stream = await this.openai.chat.completions.create(
      {
        model: this.checkedModel,
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

  /** Returns the model string after verifying the API key is present. */
  private get checkedModel(): string {
    const providerConfig = getAiProviderConfig(this.config);
    if (!providerConfig.apiKey) {
      throw new ServiceUnavailableException(providerConfig.missingKeyMessage);
    }
    return providerConfig.model;
  }

  private async generateStrictJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    label: string,
  ): Promise<T> {
    const model = this.checkedModel;
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: 'You generate strict JSON only. Do not include Markdown fences or prose.',
    };
    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      { role: 'user', content: prompt },
    ];
    let lastContent = '';
    let lastParseError = '';

    for (let attempt = 0; attempt < 2; attempt++) {
      const completion = await this.openai.chat.completions.create({
        model,
        temperature: attempt === 0 ? 0.3 : 0,
        messages,
      });

      const content = completion.choices[0]?.message.content;
      if (!content) {
        throw new BadGatewayException(`LLM 没有返回可解析的${label}内容。`);
      }

      lastContent = content;
      try {
        return schema.parse(JSON.parse(stripJsonFence(content)));
      } catch (error) {
        lastParseError = error instanceof Error ? error.message : 'Unknown parse error';
        messages.push(
          { role: 'assistant', content },
          {
            role: 'user',
            content: [
              `上一次返回的${label} JSON 没有通过校验。`,
              `校验错误：${lastParseError}`,
              '请只返回修正后的完整 JSON，不要 Markdown，不要解释。',
              '所有必填字符串字段必须是非空字符串；数组内不能包含空字符串。',
            ].join('\n'),
          },
        );
      }
    }

    try {
      return schema.parse(JSON.parse(stripJsonFence(lastContent)));
    } catch {
      throw new BadGatewayException({
        message: `LLM 返回了不合法的${label} JSON。`,
        detail: lastParseError,
      });
    }
  }

  private parseLearningPath(content: string): GenerateLearningPathOutput {
    const withoutFence = stripJsonFence(content);

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
