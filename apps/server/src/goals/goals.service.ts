import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Goal } from '@pathmind/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateGoalDto } from './dto/create-goal.dto.js';
import { completeStepProgress } from './utils/goal-progress.js';
import { toSharedGoal } from './utils/goal.mapper.js';

const DEV_USER_ID = 'local-dev-user';

@Injectable()
export class GoalsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<Goal[]> {
    const goals = await this.prisma.goal.findMany({
      where: { devUserId: DEV_USER_ID },
      orderBy: { createdAt: 'desc' },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    return goals.map(toSharedGoal);
  }

  async findOne(goalId: string): Promise<Goal> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, devUserId: DEV_USER_ID },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!goal) {
      throw new NotFoundException('没有找到这个 Goal。');
    }

    return toSharedGoal(goal);
  }

  async create(input: CreateGoalDto): Promise<Goal> {
    const goal = await this.prisma.goal.create({
      data: {
        devUserId: DEV_USER_ID,
        title: input.title,
        description: input.description,
        type: input.type,
        status: 'active',
        progress: 0,
        estimatedMinutes: input.estimatedMinutes,
        teachingStrategy: input.learningConfig.teachingStrategy,
        outputFormats: input.learningConfig.preferredOutputFormats,
        assessmentMethods: input.learningConfig.assessmentMethods,
        finalOutcome: input.finalOutcome,
        steps: {
          create: input.steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            estimatedMinutes: step.estimatedMinutes,
            status: index === 0 ? 'learning' : 'todo',
            order: index,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    return toSharedGoal(goal);
  }

  async completeStep(goalId: string, stepId: string): Promise<Goal> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, devUserId: DEV_USER_ID },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!goal) {
      throw new NotFoundException('没有找到这个 Goal。');
    }

    if (!goal.steps.some((step) => step.id === stepId)) {
      throw new NotFoundException('没有找到这个学习 Step。');
    }

    const result = completeStepProgress(goal.steps, stepId);

    const updatedGoal = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        result.steps.map((step) =>
          tx.learningStep.update({
            where: { id: step.id },
            data: { status: step.status },
          }),
        ),
      );

      return tx.goal.update({
        where: { id: goalId },
        data: {
          progress: result.progress,
          status: result.goalStatus,
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
    });

    return toSharedGoal(updatedGoal);
  }

  async remove(goalId: string): Promise<{ id: string }> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, devUserId: DEV_USER_ID },
      select: { id: true },
    });

    if (!goal) {
      throw new NotFoundException('没有找到这个 Goal。');
    }

    await this.prisma.goal.delete({
      where: { id: goalId },
    });

    return { id: goalId };
  }
}
