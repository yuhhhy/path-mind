import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Quiz,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizQuestion,
  StepSummary,
  StepVerification,
  Transfer,
} from '@pathmind/shared';
import { AiService } from '../ai/ai.service.js';
import { DEV_USER_ID } from '../config/constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  GenerateQuizDto,
  GenerateSummaryDto,
  GenerateTransferDto,
  SubmitQuizAttemptDto,
  SubmitTransferDto,
} from './dto/verification.dto.js';
import {
  buildGradeOpenAnswerPrompt,
  buildGradeTransferPrompt,
  buildQuizPrompt,
  buildStepSummaryPrompt,
  buildTransferPrompt,
} from './prompts/verification.prompt.js';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getVerification(stepId: string): Promise<StepVerification> {
    const step = await this.prisma.learningStep.findUnique({
      where: { id: stepId },
      include: { goal: true },
    });

    if (!step) {
      throw new NotFoundException('没有找到这个学习 Step。');
    }

    this.assertDevGoal(step.goal.devUserId);
    return this.buildVerification(stepId);
  }

  async generateQuiz(stepId: string, input: GenerateQuizDto): Promise<Quiz> {
    const context = await this.getStepContext(input.goalId, stepId);
    const generated = await this.aiService.generateQuiz(buildQuizPrompt(context));

    const quiz = await this.prisma.quiz.create({
      data: {
        goalId: input.goalId,
        stepId,
        questions: {
          create: generated.questions.map((question, index) => ({
            type: question.type,
            question: question.question,
            options: question.options ?? [],
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            order: index,
          })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    return this.mapQuiz(quiz);
  }

  async submitQuizAttempt(
    quizId: string,
    input: SubmitQuizAttemptDto,
  ): Promise<{ score: number; results: QuizAttemptAnswer[]; attempt: QuizAttempt }> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        step: { include: { goal: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('没有找到这个 Quiz。');
    }

    this.assertDevGoal(quiz.step.goal.devUserId);
    const answerByQuestionId = new Map(input.answers.map((answer) => [answer.questionId, answer]));
    const missingQuestion = quiz.questions.find((question) => !answerByQuestionId.has(question.id));
    if (missingQuestion) {
      throw new BadRequestException('请完成所有题目后再提交。');
    }

    const results: QuizAttemptAnswer[] = [];

    for (const question of quiz.questions) {
      const answer = answerByQuestionId.get(question.id);
      if (!answer) continue;

      if (question.type === 'single_choice') {
        const isCorrect =
          normalizeAnswer(answer.answer) === normalizeAnswer(question.correctAnswer);
        results.push({
          questionId: question.id,
          answer: answer.answer,
          isCorrect,
          feedback: isCorrect
            ? '回答正确。'
            : `还差一点。参考答案：${question.correctAnswer}。${question.explanation}`,
        });
      } else {
        const grading = await this.aiService.gradeOpenAnswer(
          buildGradeOpenAnswerPrompt({
            questionType: question.type === 'explain_back' ? 'explain_back' : 'scenario_question',
            question: question.question,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            userAnswer: answer.answer,
          }),
        );
        results.push({
          questionId: question.id,
          answer: answer.answer,
          isCorrect: grading.isCorrect,
          feedback: grading.feedback,
        });
      }
    }

    const correctCount = results.filter((result) => result.isCorrect).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        score,
        answers: {
          create: results.map((result) => ({
            questionId: result.questionId,
            answer: result.answer,
            isCorrect: result.isCorrect,
            feedback: result.feedback,
          })),
        },
      },
      include: { answers: true },
    });

    return {
      score,
      results,
      attempt: this.mapQuizAttempt(attempt),
    };
  }

  async generateTransfer(stepId: string, input: GenerateTransferDto): Promise<Transfer> {
    const existing = await this.prisma.transfer.findUnique({ where: { stepId } });
    if (existing) {
      return this.mapTransfer(existing);
    }

    const context = await this.getStepContext(input.goalId, stepId);
    const quiz = await this.prisma.quiz.findFirst({
      where: { stepId, goalId: input.goalId },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { orderBy: { order: 'asc' } },
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { answers: true },
        },
      },
    });

    const latestAttempt = quiz?.attempts[0];
    const questionById = new Map(quiz?.questions.map((q) => [q.id, q]) ?? []);
    const quizResults =
      latestAttempt?.answers.map((answer) => ({
        question: questionById.get(answer.questionId)?.question ?? '',
        answer: answer.answer,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
      })) ?? [];

    const generated = await this.aiService.generateTransfer(
      buildTransferPrompt({ ...context, quizResults }),
    );

    const transfer = await this.prisma.transfer.create({
      data: {
        goalId: input.goalId,
        stepId,
        prompt: generated.prompt,
      },
    });

    return this.mapTransfer(transfer);
  }

  async submitTransfer(stepId: string, input: SubmitTransferDto): Promise<Transfer> {
    const transfer = await this.prisma.transfer.findUnique({ where: { stepId } });
    if (!transfer) {
      throw new BadRequestException('请先生成迁移应用题，再提交答案。');
    }

    const step = await this.prisma.learningStep.findFirst({
      where: { id: stepId, goalId: input.goalId },
      include: { goal: true },
    });
    if (!step) {
      throw new NotFoundException('没有找到这个学习 Step。');
    }
    this.assertDevGoal(step.goal.devUserId);

    const grading = await this.aiService.gradeTransfer(
      buildGradeTransferPrompt({
        stepTitle: step.title,
        stepDescription: step.description,
        transferPrompt: transfer.prompt,
        userAnswer: input.content,
      }),
    );

    const updated = await this.prisma.transfer.update({
      where: { stepId },
      data: {
        userAnswer: input.content,
        aiFeedback: grading.feedback,
        score: grading.score,
      },
    });

    return this.mapTransfer(updated);
  }

  async generateSummary(stepId: string, input: GenerateSummaryDto): Promise<StepSummary> {
    const [context, quiz, transfer] = await Promise.all([
      this.getStepContext(input.goalId, stepId),
      this.prisma.quiz.findFirst({
        where: { stepId, goalId: input.goalId },
        orderBy: { createdAt: 'desc' },
        include: {
          questions: { orderBy: { order: 'asc' } },
          attempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { answers: true },
          },
        },
      }),
      this.prisma.transfer.findUnique({ where: { stepId } }),
    ]);
    const latestAttempt = quiz?.attempts[0];

    if (!quiz || !latestAttempt || !transfer?.userAnswer || !transfer.aiFeedback) {
      throw new BadRequestException('请先完成测验和迁移应用，再生成总结。');
    }

    const questionById = new Map(quiz.questions.map((question) => [question.id, question]));
    const generated = await this.aiService.generateStepSummary(
      buildStepSummaryPrompt({
        ...context,
        quizScore: latestAttempt.score,
        quizResults: latestAttempt.answers.map((answer) => ({
          question: questionById.get(answer.questionId)?.question ?? '',
          answer: answer.answer,
          isCorrect: answer.isCorrect,
          feedback: answer.feedback,
        })),
        transfer: {
          prompt: transfer.prompt,
          userAnswer: transfer.userAnswer,
          aiFeedback: transfer.aiFeedback,
          score: transfer.score ?? 0,
        },
      }),
    );

    const summary = await this.prisma.stepSummary.upsert({
      where: { stepId },
      create: {
        goalId: input.goalId,
        stepId,
        content: generated.content,
        keyTakeaways: generated.keyTakeaways,
        weakPoints: generated.weakPoints,
        nextSuggestions: generated.nextSuggestions,
      },
      update: {
        content: generated.content,
        keyTakeaways: generated.keyTakeaways,
        weakPoints: generated.weakPoints,
        nextSuggestions: generated.nextSuggestions,
      },
    });

    return this.mapSummary(summary);
  }

  async canCompleteStep(stepId: string): Promise<boolean> {
    const verification = await this.buildVerification(stepId);
    return verification.canCompleteStep;
  }

  private async getStepContext(goalId: string, stepId: string) {
    const step = await this.prisma.learningStep.findFirst({
      where: { id: stepId, goalId },
      include: {
        goal: true,
        chatSession: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    if (!step) {
      throw new NotFoundException('没有找到这个学习 Step。');
    }

    this.assertDevGoal(step.goal.devUserId);

    return {
      goalTitle: step.goal.title,
      goalDescription: step.goal.description,
      stepTitle: step.title,
      stepDescription: step.description,
      teachingContent:
        step.chatSession?.messages
          .filter((message) => message.role === 'assistant')
          .map((message) => message.content)
          .join('\n\n') || '暂无持久化教学内容。',
    };
  }

  private async buildVerification(stepId: string): Promise<StepVerification> {
    const [quiz, transfer, summary] = await Promise.all([
      this.prisma.quiz.findFirst({
        where: { stepId },
        orderBy: { createdAt: 'desc' },
        include: {
          questions: { orderBy: { order: 'asc' } },
          attempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { answers: true },
          },
        },
      }),
      this.prisma.transfer.findUnique({ where: { stepId } }),
      this.prisma.stepSummary.findUnique({ where: { stepId } }),
    ]);
    const latestAttempt = quiz?.attempts[0];

    return {
      quiz: quiz ? this.mapQuiz(quiz) : undefined,
      latestAttempt: latestAttempt ? this.mapQuizAttempt(latestAttempt) : undefined,
      transfer: transfer ? this.mapTransfer(transfer) : undefined,
      summary: summary ? this.mapSummary(summary) : undefined,
      canCompleteStep: Boolean(latestAttempt && transfer?.userAnswer && summary),
    };
  }

  private assertDevGoal(devUserId: string) {
    if (devUserId !== DEV_USER_ID) {
      throw new ForbiddenException('不能访问这个 Goal。');
    }
  }

  private mapQuiz(quiz: {
    id: string;
    goalId: string;
    stepId: string;
    createdAt: Date;
    questions: Array<{
      id: string;
      type: string;
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      order: number;
    }>;
  }): Quiz {
    return {
      id: quiz.id,
      goalId: quiz.goalId,
      stepId: quiz.stepId,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map(
        (question): QuizQuestion => ({
          id: question.id,
          type: (question.type === 'single_choice'
            ? 'single_choice'
            : question.type === 'explain_back'
              ? 'explain_back'
              : 'scenario_question') as QuizQuestion['type'],
          question: question.question,
          options: question.options.length > 0 ? question.options : undefined,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          order: question.order,
        }),
      ),
    };
  }

  private mapQuizAttempt(attempt: {
    id: string;
    quizId: string;
    score: number;
    createdAt: Date;
    answers: Array<{
      questionId: string;
      answer: string;
      isCorrect: boolean;
      feedback: string;
    }>;
  }): QuizAttempt {
    return {
      id: attempt.id,
      quizId: attempt.quizId,
      score: attempt.score,
      createdAt: attempt.createdAt.toISOString(),
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
      })),
    };
  }

  private mapTransfer(transfer: {
    id: string;
    goalId: string;
    stepId: string;
    prompt: string;
    userAnswer: string | null;
    aiFeedback: string | null;
    score: number | null;
    createdAt: Date;
  }): Transfer {
    return {
      id: transfer.id,
      goalId: transfer.goalId,
      stepId: transfer.stepId,
      prompt: transfer.prompt,
      userAnswer: transfer.userAnswer ?? undefined,
      aiFeedback: transfer.aiFeedback ?? undefined,
      score: transfer.score ?? undefined,
      createdAt: transfer.createdAt.toISOString(),
    };
  }

  private mapSummary(summary: {
    id: string;
    goalId: string;
    stepId: string;
    content: string;
    keyTakeaways: string[];
    weakPoints: string[];
    nextSuggestions: string[];
    createdAt: Date;
    updatedAt: Date;
  }): StepSummary {
    return {
      ...summary,
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    };
  }
}

function normalizeAnswer(answer: string) {
  return answer.trim().toLowerCase();
}
