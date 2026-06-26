import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { createGoalSchema } from './dto/create-goal.dto.js';
import { GoalsService } from './goals.service.js';

@Controller('goals')
export class GoalsController {
  constructor(@Inject(GoalsService) private readonly goalsService: GoalsService) {}

  @Get()
  findAll() {
    return this.goalsService.findAll();
  }

  @Get(':goalId')
  findOne(@Param('goalId') goalId: string) {
    return this.goalsService.findOne(goalId);
  }

  @Post()
  create(@Body() body: unknown) {
    try {
      return this.goalsService.create(createGoalSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: '请求体不符合 CreateGoalInput。',
          issues: error.issues,
        });
      }

      throw error;
    }
  }

  @Patch(':goalId/steps/:stepId/complete')
  completeStep(
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
    @Body() body: { force?: boolean } = {},
  ) {
    return this.goalsService.completeStep(goalId, stepId, { force: body.force === true });
  }

  @Delete(':goalId')
  remove(@Param('goalId') goalId: string) {
    return this.goalsService.remove(goalId);
  }
}
