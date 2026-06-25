import { describe, expect, it } from 'vite-plus/test';
import { mapGeneratedPathToCreateGoalInput } from '../api';

describe('mapGeneratedPathToCreateGoalInput', () => {
  it('maps a generated learning path into the create goal payload', () => {
    const payload = mapGeneratedPathToCreateGoalInput(
      {
        goalTitle: '学会浏览器渲染',
        goalType: 'understand_concept',
        learningConfig: {
          teachingStrategy: 'first_principles',
          preferredOutputFormats: ['text'],
          assessmentMethods: ['teach_back'],
        },
      },
      {
        title: '学会浏览器渲染',
        description: '理解完整链路',
        estimatedMinutes: 40,
        finalOutcome: ['能讲清楚'],
        steps: [
          {
            id: 'network',
            title: '理解网络',
            description: 'DNS 到 HTTP',
            estimatedMinutes: 10,
          },
        ],
      },
    );

    expect(payload.type).toBe('understand_concept');
    expect(payload.steps[0]).toEqual({
      title: '理解网络',
      description: 'DNS 到 HTTP',
      estimatedMinutes: 10,
    });
  });
});
