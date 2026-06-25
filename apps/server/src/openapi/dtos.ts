import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LearningConfigDto {
  @ApiProperty({
    enum: ['first_principles', 'step_by_step', 'analogy', 'case_based', 'source_code_oriented'],
    example: 'first_principles',
  })
  teachingStrategy!: string;

  @ApiProperty({
    enum: ['text', 'flowchart', 'mindmap', 'table', 'code_example'],
    isArray: true,
    example: ['flowchart', 'text'],
  })
  preferredOutputFormats!: string[];

  @ApiProperty({
    enum: ['quiz', 'teach_back', 'practice_task', 'interview_question'],
    isArray: true,
    example: ['teach_back', 'interview_question'],
  })
  assessmentMethods!: string[];
}

export class LearningStepDto {
  @ApiProperty({ example: 'network-request' })
  id!: string;

  @ApiProperty({ example: '理解网络请求阶段' })
  title!: string;

  @ApiProperty({ example: '理解 URL 解析、DNS、TCP、TLS、HTTP 请求之间的顺序。' })
  description!: string;

  @ApiProperty({ enum: ['todo', 'learning', 'done'], example: 'learning' })
  status!: string;

  @ApiProperty({ example: 12 })
  estimatedMinutes!: number;
}

export class GoalDto {
  @ApiProperty({ example: 'cmqtdnd6p0000xcobs2uqh769' })
  id!: string;

  @ApiProperty({ example: '学会从输入 URL 到浏览器渲染' })
  title!: string;

  @ApiProperty({ example: '理解从用户输入 URL 到浏览器最终渲染页面的完整流程。' })
  description!: string;

  @ApiProperty({
    enum: ['understand_concept', 'prepare_interview', 'build_project', 'pass_exam'],
    example: 'understand_concept',
  })
  type!: string;

  @ApiProperty({ enum: ['active', 'completed', 'paused'], example: 'active' })
  status!: string;

  @ApiProperty({ example: 0 })
  progress!: number;

  @ApiProperty({ example: 60 })
  estimatedMinutes!: number;

  @ApiProperty({ type: LearningConfigDto })
  learningConfig!: LearningConfigDto;

  @ApiProperty({ type: String, isArray: true, example: ['能画出完整流程图'] })
  finalOutcome!: string[];

  @ApiProperty({ type: LearningStepDto, isArray: true })
  steps!: LearningStepDto[];
}

export class CreateGoalStepDto {
  @ApiProperty({ example: '建立整体流程' })
  title!: string;

  @ApiProperty({ example: '先从全局看清楚 URL 输入后的主干链路。' })
  description!: string;

  @ApiProperty({ example: 8 })
  estimatedMinutes!: number;
}

export class CreateGoalDto {
  @ApiProperty({ example: '学会从输入 URL 到浏览器渲染' })
  title!: string;

  @ApiProperty({ example: '理解完整流程，并能够用面试语言清楚表达。' })
  description!: string;

  @ApiProperty({
    enum: ['understand_concept', 'prepare_interview', 'build_project', 'pass_exam'],
    example: 'understand_concept',
  })
  type!: string;

  @ApiProperty({ example: 60 })
  estimatedMinutes!: number;

  @ApiProperty({ type: LearningConfigDto })
  learningConfig!: LearningConfigDto;

  @ApiProperty({ type: String, isArray: true, example: ['能画出完整流程图'] })
  finalOutcome!: string[];

  @ApiProperty({ type: CreateGoalStepDto, isArray: true })
  steps!: CreateGoalStepDto[];
}

export class GenerateLearningPathInputDto {
  @ApiProperty({ example: '学会从输入 URL 到浏览器渲染' })
  goalTitle!: string;

  @ApiPropertyOptional({ example: '用于前端面试准备' })
  goalDescription?: string;

  @ApiProperty({
    enum: ['understand_concept', 'prepare_interview', 'build_project', 'pass_exam'],
    example: 'understand_concept',
  })
  goalType!: string;

  @ApiProperty({ type: LearningConfigDto })
  learningConfig!: LearningConfigDto;
}

export class GeneratedLearningStepDto {
  @ApiProperty({ example: 'network-request' })
  id!: string;

  @ApiProperty({ example: '理解网络请求阶段' })
  title!: string;

  @ApiProperty({ example: '理解 URL 解析、DNS、TCP、TLS、HTTP 请求之间的顺序。' })
  description!: string;

  @ApiProperty({ example: 12 })
  estimatedMinutes!: number;
}

export class GenerateLearningPathOutputDto {
  @ApiProperty({ example: '从输入 URL 到浏览器渲染：第一性原理学习路径' })
  title!: string;

  @ApiProperty({ example: '一条可执行的学习路径。' })
  description!: string;

  @ApiProperty({ example: 70 })
  estimatedMinutes!: number;

  @ApiProperty({ type: String, isArray: true, example: ['能用自己的话讲清完整链路'] })
  finalOutcome!: string[];

  @ApiProperty({ type: GeneratedLearningStepDto, isArray: true })
  steps!: GeneratedLearningStepDto[];
}

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'assistant' })
  role!: string;

  @ApiProperty({ example: '我们先看当前 Step 要解决的问题。' })
  content!: string;
}

export class ChatSessionResponseDto {
  @ApiProperty({ type: ChatMessageDto, isArray: true })
  messages!: ChatMessageDto[];
}

export class ChatSessionInputDto {
  @ApiProperty({ type: GoalDto })
  goal!: GoalDto;

  @ApiProperty({ type: LearningStepDto })
  step!: LearningStepDto;

  @ApiProperty({ type: ChatMessageDto, isArray: true })
  messages!: ChatMessageDto[];

  @ApiPropertyOptional({ example: '这里为什么需要 DNS？' })
  userMessage?: string;
}

export class SseDeltaEventDto {
  @ApiProperty({ enum: ['delta'], example: 'delta' })
  type!: 'delta';

  @ApiProperty({ example: '一段流式内容' })
  content!: string;
}

export class SseDoneEventDto {
  @ApiProperty({ enum: ['done'], example: 'done' })
  type!: 'done';
}

export class SseErrorEventDto {
  @ApiProperty({ enum: ['error'], example: 'error' })
  type!: 'error';

  @ApiProperty({ example: 'AI 服务暂时不可用。' })
  message!: string;
}
