import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodError } from 'zod';
import { createWorkflowSessionSchema } from './dto/create-workflow-session.dto.js';
import { sendWorkflowMessageSchema } from './dto/send-workflow-message.dto.js';
import { WorkflowService } from './workflow.service.js';

@ApiTags('workflow')
@Controller('workflow/sessions')
export class WorkflowController {
  constructor(@Inject(WorkflowService) private readonly workflowService: WorkflowService) {}

  @Post()
  create(@Body() body: unknown) {
    try {
      return this.workflowService.create(createWorkflowSessionSchema.parse(body));
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Get()
  findAll() {
    return this.workflowService.findAll();
  }

  @Get(':sessionId')
  findOne(@Param('sessionId') sessionId: string) {
    return this.workflowService.findOne(sessionId);
  }

  @Post(':sessionId/messages')
  sendMessage(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    try {
      return this.workflowService.sendMessage(sessionId, sendWorkflowMessageSchema.parse(body));
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  private handleValidationError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException({ message: 'Workflow 请求体不合法。', issues: error.issues });
    }
    throw error;
  }
}
