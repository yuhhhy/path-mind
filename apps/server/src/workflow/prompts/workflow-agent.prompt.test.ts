import { describe, expect, it } from 'vite-plus/test';
import { WORKFLOW_AGENT_SYSTEM_PROMPT } from './workflow-agent.prompt.js';

describe('WORKFLOW_AGENT_SYSTEM_PROMPT', () => {
  it('contains the stateful multi-turn workflow rules', () => {
    expect(WORKFLOW_AGENT_SYSTEM_PROMPT).toContain('WorkflowSession');
    expect(WORKFLOW_AGENT_SYSTEM_PROMPT).toContain('目标模糊');
    expect(WORKFLOW_AGENT_SYSTEM_PROMPT).toContain('create_plan');
    expect(WORKFLOW_AGENT_SYSTEM_PROMPT).toContain('优先推进当前未完成 step');
    expect(WORKFLOW_AGENT_SYSTEM_PROMPT).toContain('finalize');
    expect(WORKFLOW_AGENT_SYSTEM_PROMPT).toContain('严禁输出完整推理链');
  });
});
