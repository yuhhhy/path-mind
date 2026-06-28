import { Inject, Injectable } from '@nestjs/common';
import { AiService } from '../../ai/ai.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { buildWorkflowPlanPrompt } from '../prompts/workflow-plan.prompt.js';
import { runAskUserTool } from '../tools/ask-user.tool.js';
import { formatPlanMessage, parseWorkflowPlan } from '../tools/create-plan.tool.js';
import { buildWorkflowQuizPrompt } from '../tools/create-quiz.tool.js';
import { buildFinalizePrompt } from '../tools/finalize.tool.js';
import { buildGenerateContentPrompt } from '../tools/generate-content.tool.js';
import { buildWorkflowLearningPathPrompt } from '../tools/generate-learning-path.tool.js';
import { buildWorkflowSummaryPrompt } from '../tools/summarize.tool.js';
import type { WorkflowDecision, WorkflowExecutionResult } from '../tools/workflow-tool.types.js';
import type { LoadedWorkflow } from './workflow-context.builder.js';

const MARKDOWN_SYSTEM_PROMPT =
  '你是 PathMind Workflow 的内容执行器。只生成用户可见的最终内容，不暴露 chain-of-thought。';
const JSON_SYSTEM_PROMPT = '你只输出严格 JSON，不要 Markdown 代码块或额外解释。';

@Injectable()
export class WorkflowActionExecutor {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(
    workflow: LoadedWorkflow,
    decision: WorkflowDecision,
  ): Promise<WorkflowExecutionResult> {
    switch (decision.action) {
      case 'ask_user':
      case 'wait_user':
        return this.waitForUser(workflow.id, decision);
      case 'create_plan':
      case 'update_plan':
        return this.createPlan(workflow, decision);
      case 'execute_step':
      case 'generate_content':
        return this.generateContent(workflow, decision);
      case 'generate_learning_path':
        return this.generateLearningPath(workflow, decision);
      case 'create_quiz':
        return this.createQuiz(workflow, decision);
      case 'summarize':
        return this.summarize(workflow);
      case 'finalize':
        return this.finalize(workflow, decision);
    }
  }

  private async waitForUser(sessionId: string, decision: WorkflowDecision) {
    const message = runAskUserTool(decision.messageToUser, decision.toolInput);
    await this.prisma.workflowSession.update({
      where: { id: sessionId },
      data: { status: 'waiting_user' },
    });
    return { message, output: { questions: message }, shouldStop: true };
  }

  private async createPlan(workflow: LoadedWorkflow, decision: WorkflowDecision) {
    const content = await this.aiService.completeText(
      JSON_SYSTEM_PROMPT,
      buildWorkflowPlanPrompt(workflow.userGoal, workflow.context),
      { temperature: 0.2 },
    );
    const plan = parseWorkflowPlan(content);

    if (decision.action === 'update_plan') {
      await this.prisma.workflowStep.deleteMany({
        where: { sessionId: workflow.id, status: { not: 'done' } },
      });
    }
    const lastRemaining = await this.prisma.workflowStep.findFirst({
      where: { sessionId: workflow.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const baseOrder = (lastRemaining?.order ?? -1) + 1;
    await this.prisma.workflowStep.createMany({
      data: plan.steps.map((step, index) => ({
        sessionId: workflow.id,
        title: step.title,
        description: step.description,
        status: 'todo',
        order: baseOrder + index,
      })),
    });
    const firstStep = await this.prisma.workflowStep.findFirst({
      where: { sessionId: workflow.id, status: 'todo' },
      orderBy: { order: 'asc' },
    });
    await this.prisma.workflowSession.update({
      where: { id: workflow.id },
      data: { status: 'running', currentStepId: firstStep?.id ?? null },
    });
    return {
      message: decision.messageToUser.trim() || formatPlanMessage(plan.steps),
      output: { steps: plan.steps },
      shouldStop: false,
    };
  }

  private async generateContent(workflow: LoadedWorkflow, decision: WorkflowDecision) {
    const step = this.currentStep(workflow);
    if (step) {
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: { status: 'running' },
      });
    }
    const content = await this.aiService.completeText(
      MARKDOWN_SYSTEM_PROMPT,
      buildGenerateContentPrompt({
        goal: workflow.userGoal,
        context: workflow.context,
        step,
        instruction: decision.toolInput.instruction,
      }),
    );
    await this.completeStep(workflow, step?.id, content);
    return { message: content, output: { content }, shouldStop: false };
  }

  private async generateLearningPath(workflow: LoadedWorkflow, _decision: WorkflowDecision) {
    const step = this.currentStep(workflow);
    const content = await this.aiService.completeText(
      MARKDOWN_SYSTEM_PROMPT,
      buildWorkflowLearningPathPrompt(workflow.userGoal, workflow.context),
    );
    await this.completeStep(workflow, step?.id, content);
    return { message: content, output: { content }, shouldStop: false };
  }

  private async createQuiz(workflow: LoadedWorkflow, _decision: WorkflowDecision) {
    const step = this.currentStep(workflow);
    const content = await this.aiService.completeText(
      MARKDOWN_SYSTEM_PROMPT,
      buildWorkflowQuizPrompt(workflow.userGoal, workflow.context, step?.title),
    );
    if (step) {
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: { status: 'waiting_user', result: content },
      });
    }
    await this.prisma.workflowSession.update({
      where: { id: workflow.id },
      data: { status: 'waiting_user', currentStepId: step?.id },
    });
    return { message: content, output: { content }, shouldStop: true };
  }

  private async summarize(workflow: LoadedWorkflow) {
    const content = await this.aiService.completeText(
      MARKDOWN_SYSTEM_PROMPT,
      buildWorkflowSummaryPrompt(workflow.userGoal, workflow.context, this.results(workflow)),
    );
    return { message: content, output: { content }, shouldStop: false };
  }

  private async finalize(workflow: LoadedWorkflow, decision: WorkflowDecision) {
    const suppliedOutput = decision.toolInput.finalOutput;
    const content =
      typeof suppliedOutput === 'string' && suppliedOutput.trim()
        ? suppliedOutput.trim()
        : await this.aiService.completeText(
            MARKDOWN_SYSTEM_PROMPT,
            buildFinalizePrompt(workflow.userGoal, workflow.context, this.results(workflow)),
          );
    await this.prisma.workflowSession.update({
      where: { id: workflow.id },
      data: { status: 'completed', currentStepId: null, finalOutput: content },
    });
    return { message: content, output: { finalOutput: content }, shouldStop: true };
  }

  private currentStep(workflow: LoadedWorkflow) {
    return (
      workflow.steps.find((step) => step.id === workflow.currentStepId) ??
      workflow.steps.find((step) => step.status === 'todo' || step.status === 'running')
    );
  }

  private results(workflow: LoadedWorkflow) {
    return workflow.steps
      .filter((step) => step.result)
      .map((step) => `## ${step.title}\n\n${step.result}`);
  }

  private async completeStep(workflow: LoadedWorkflow, stepId: string | undefined, result: string) {
    if (stepId) {
      await this.prisma.workflowStep.update({
        where: { id: stepId },
        data: { status: 'done', result },
      });
    }
    const nextStep = await this.prisma.workflowStep.findFirst({
      where: { sessionId: workflow.id, status: 'todo', id: { not: stepId } },
      orderBy: { order: 'asc' },
    });
    await this.prisma.workflowSession.update({
      where: { id: workflow.id },
      data: {
        status: 'running',
        currentStepId: nextStep?.id ?? null,
      },
    });
  }
}
