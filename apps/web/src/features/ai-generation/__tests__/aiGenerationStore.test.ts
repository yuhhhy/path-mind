import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useAIGenerationStore } from '../aiGenerationStore';

describe('aiGenerationStore', () => {
  beforeEach(() => {
    useAIGenerationStore.setState({ tasks: [], isPanelOpen: false });
  });

  it('keeps the existing title when a status update does not provide one', () => {
    const store = useAIGenerationStore.getState();
    store.upsertTask({
      id: 'quiz',
      title: '生成综合测验',
      status: 'running',
    });

    store.setTaskStatus('quiz', 'done', { title: undefined });

    expect(useAIGenerationStore.getState().tasks[0]).toMatchObject({
      title: '生成综合测验',
      status: 'done',
    });
  });
});
