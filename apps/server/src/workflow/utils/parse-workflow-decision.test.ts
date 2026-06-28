import { BadGatewayException } from '@nestjs/common';
import { describe, expect, it } from 'vite-plus/test';
import { parseWorkflowDecision } from './parse-workflow-decision.js';

describe('parseWorkflowDecision', () => {
  it('parses a valid strict JSON decision', () => {
    expect(
      parseWorkflowDecision(
        JSON.stringify({
          action: 'ask_user',
          reasoningSummary: '目标范围还不够明确',
          messageToUser: '你有多少准备时间？',
          toolInput: { questions: ['你有多少准备时间？'] },
          shouldContinue: false,
        }),
      ),
    ).toMatchObject({ action: 'ask_user', shouldContinue: false });
  });

  it('throws a useful gateway error for invalid JSON', () => {
    expect(() => parseWorkflowDecision('{not-json}')).toThrow(BadGatewayException);
  });
});
