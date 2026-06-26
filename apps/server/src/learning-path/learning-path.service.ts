import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable } from '@nestjs/common';
import type { GenerateLearningPathOutput, Goal, LearningStep } from '@pathmind/shared';
import { AiService } from '../ai/ai.service.js';
import { buildChatCoachPrompt } from '../chat/prompts/chat-coach.prompt.js';
import { writeSse } from '../common/sse/sse.utils.js';
import { DEV_USER_ID } from '../config/constants.js';
import { toSharedGoal } from '../goals/utils/goal.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { GenerateLearningPathDto } from './dto/generate-learning-path.dto.js';
import { buildLearningPathPrompt } from './prompts/learning-path.prompt.js';

const INITIAL_CHAT_PREWARM_CONCURRENCY = 2;

@Injectable()
export class LearningPathService {
  private readonly pendingInitialChatPrewarm: Array<() => Promise<void>> = [];
  private readonly prewarmingStepIds = new Set<string>();
  private activeInitialChatPrewarmCount = 0;

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

    // Guard: generation previously failed — surface the error to the client.
    if (goalRecord.status === 'failed') {
      writeSse(res, { type: 'error', message: '学习路径生成失败，请删除后重新创建。' });
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
            status: step.status as LearningStep['status'],
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
              status: step.status as LearningStep['status'],
              estimatedMinutes: step.estimatedMinutes,
            },
          });
          this.scheduleInitialChatPrewarm(goalId, step.id);
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
      // Mark the goal as failed so the frontend stops retrying on refresh.
      // Best-effort: ignore DB errors here to avoid masking the original error.
      void this.prisma.goal
        .update({ where: { id: goalId }, data: { status: 'failed' } })
        .catch(() => undefined);

      if (!closed) {
        const message = error instanceof Error ? error.message : 'AI 服务暂时不可用。';
        writeSse(res, { type: 'error', message });
        res.end();
      }
    }
  }

  private scheduleInitialChatPrewarm(goalId: string, stepId: string) {
    if (this.prewarmingStepIds.has(stepId)) return;

    this.prewarmingStepIds.add(stepId);
    this.pendingInitialChatPrewarm.push(async () => {
      try {
        await this.generateInitialChatForStep(goalId, stepId);
      } catch (error) {
        console.error(`[prewarm] step ${stepId} failed:`, error);
      } finally {
        this.prewarmingStepIds.delete(stepId);
      }
    });
    this.runInitialChatPrewarmQueue();
  }

  private runInitialChatPrewarmQueue() {
    while (
      this.activeInitialChatPrewarmCount < INITIAL_CHAT_PREWARM_CONCURRENCY &&
      this.pendingInitialChatPrewarm.length > 0
    ) {
      const task = this.pendingInitialChatPrewarm.shift();
      if (!task) return;

      this.activeInitialChatPrewarmCount++;
      void task().finally(() => {
        this.activeInitialChatPrewarmCount--;
        this.runInitialChatPrewarmQueue();
      });
    }
  }

  private async generateInitialChatForStep(goalId: string, stepId: string): Promise<void> {
    const goalRecord = await this.prisma.goal.findUnique({
      where: { id: goalId, devUserId: DEV_USER_ID },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    const stepRecord = goalRecord?.steps.find((step) => step.id === stepId);
    if (!goalRecord || !stepRecord) return;

    const session = await this.prisma.chatSession.upsert({
      where: { stepId },
      create: { goalId, stepId },
      update: { goalId },
    });

    const existingAssistantMessage = await this.prisma.chatMessage.findFirst({
      where: { sessionId: session.id, role: 'assistant' },
      select: { id: true },
    });
    if (existingAssistantMessage) return;

    const goal = toSharedGoal(goalRecord);
    const step: LearningStep = {
      id: stepRecord.id,
      title: stepRecord.title,
      description: stepRecord.description,
      status: stepRecord.status as LearningStep['status'],
      estimatedMinutes: stepRecord.estimatedMinutes,
    };
    const userMessage = `请开始当前 Step「${step.title}」的教学。`;
    const systemPrompt = buildChatCoachPrompt({ goal: goal as Goal, step, messages: [] });
    let assistantContent = '';
    let lastFlushAt = 0;
    const assistantDraft = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: '',
        status: 'streaming',
      },
    });

    for await (const chunk of this.aiService.streamCoachReply(systemPrompt, [
      { role: 'user', content: userMessage },
    ])) {
      assistantContent += chunk;
      const now = Date.now();
      if (now - lastFlushAt >= 500) {
        lastFlushAt = now;
        await this.prisma.chatMessage.update({
          where: { id: assistantDraft.id },
          data: { content: assistantContent, status: 'streaming' },
        });
      }
    }

    await this.prisma.chatMessage.update({
      where: { id: assistantDraft.id },
      data: { content: assistantContent, status: 'complete' },
    });
  }
}
