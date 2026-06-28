import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WorkflowActionExecutor } from './runtime/workflow-action.executor.js';
import { WorkflowContextBuilder } from './runtime/workflow-context.builder.js';
import { WorkflowRuntimeService } from './runtime/workflow-runtime.service.js';
import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowRuntimeService,
    WorkflowContextBuilder,
    WorkflowActionExecutor,
  ],
})
export class WorkflowModule {}
