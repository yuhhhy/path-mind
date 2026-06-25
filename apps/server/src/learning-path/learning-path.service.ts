import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable } from '@nestjs/common';
import type { GenerateLearningPathOutput } from '@pathmind/shared';
import { AiService } from '../ai/ai.service.js';
import type { SseEvent } from '../common/sse/sse.types.js';
import { formatSseEvent } from '../common/sse/sse.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { GenerateLearningPathDto } from './dto/generate-learning-path.dto.js';
import { buildLearningPathPrompt } from './prompts/learning-path.prompt.js';

const DEV_USER_ID = 'local-dev-user';

function writeSse(res: ServerResponse, event: SseEvent) {
  res.write(formatSseEvent(event));
  (res as ServerResponse & { flush?: () => void }).flush?.();
}

@Injectable()
export class LearningPathService {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async generate(input: GenerateLearningPathDto): Promise<GenerateLearningPathOutput> {
    return this.aiService.generateLearningPath(buildLearningPathPrompt(input));
  }

  async initGoal(input: GenerateLearningPathDto): Promise<{ goalId: string }> {
    const goal = await this.prisma.goal.create({
      data: {
        devUserId: DEV_USER_ID,
        title: input.goalTitle,
        description: '',
        type: input.goalType,
        status: 'initializing',
        progress: 0,
        estimatedMinutes: 0,
        teachingStrategy: input.learningConfig.teachingStrategy,
        outputFormats: input.learningConfig.preferredOutputFormats,
        assessmentMethods: input.learningConfig.assessmentMethods,
        finalOutcome: [],
      },
    });
    return { goalId: goal.id };
  }

  async streamSteps(goalId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const goalRecord = await this.prisma.goal.findUnique({
      where: { id: goalId, devUserId: DEV_USER_ID },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!goalRecord) {
      writeSse(res, { type: 'error', message: '没有找到这个 Goal。' });
      res.end();
      return;
    }

    // Guard: already generated — replay existing steps immediately
    if (goalRecord.status !== 'initializing' && goalRecord.steps.length > 0) {
      for (const step of goalRecord.steps) {
        writeSse(res, {
          type: 'step',
          step: {
            id: step.id,
            title: step.title,
            description: step.description,
            status: step.status,
            estimatedMinutes: step.estimatedMinutes,
          },
        });
      }
      writeSse(res, { type: 'done' });
      res.end();
      return;
    }

    let closed = false;
    const aiAbortController = new AbortController();
    req.on('close', () => {
      closed = true;
      aiAbortController.abort();
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const promptInput: GenerateLearningPathDto = {
        goalTitle: goalRecord.title,
        goalType: goalRecord.type as GenerateLearningPathDto['goalType'],
        learningConfig: {
          teachingStrategy:
            goalRecord.teachingStrategy as GenerateLearningPathDto['learningConfig']['teachingStrategy'],
          preferredOutputFormats:
            goalRecord.outputFormats as GenerateLearningPathDto['learningConfig']['preferredOutputFormats'],
          assessmentMethods:
            goalRecord.assessmentMethods as GenerateLearningPathDto['learningConfig']['assessmentMethods'],
        },
      };

      let stepOrder = 0;

      for await (const event of this.aiService.streamLearningPathEvents(
        buildLearningPathPrompt(promptInput),
        aiAbortController.signal,
      )) {
        if (closed) {
          return;
        }

        if (event.type === 'metadata') {
          await this.prisma.goal.update({
            where: { id: goalId },
            data: {
              title: event.title,
              description: event.description,
              estimatedMinutes: event.estimatedMinutes,
              finalOutcome: event.finalOutcome,
            },
          });
        } else if (event.type === 'step') {
          const step = await this.prisma.learningStep.create({
            data: {
              goalId,
              title: event.title,
              description: event.description,
              estimatedMinutes: event.estimatedMinutes,
              status: stepOrder === 0 ? 'learning' : 'todo',
              order: stepOrder++,
            },
          });

          writeSse(res, {
            type: 'step',
            step: {
              id: step.id,
              title: step.title,
              description: step.description,
              status: step.status,
              estimatedMinutes: step.estimatedMinutes,
            },
          });
        }
      }

      if (!closed) {
        await this.prisma.goal.update({
          where: { id: goalId },
          data: { status: 'active' },
        });
        writeSse(res, { type: 'done' });
        res.end();
      }
    } catch (error) {
      if (!closed) {
        const message = error instanceof Error ? error.message : 'AI 服务暂时不可用。';
        writeSse(res, { type: 'error', message });
        res.end();
      }
    }
  }
}
