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

// Used for streaming incremental step detection (id is optional — we assign our own)
const streamStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});

// Used for the non-streaming full-JSON parse path
const fullStepSchema = z.object({
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
  steps: z.array(fullStepSchema).min(4).max(7),
});

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
    this.ensureApiKey();

    const stream = await this.openai.chat.completions.create(
      {
        model: this.model,
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
