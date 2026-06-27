import { create } from 'zustand';

export type AIGenerationTaskStatus = 'queued' | 'running' | 'done' | 'failed';

export interface AIGenerationTask {
  id: string;
  title: string;
  description?: string;
  status: AIGenerationTaskStatus;
  scope?: {
    goalId?: string;
    stepId?: string;
  };
  createdAt: number;
  updatedAt: number;
  error?: string;
}

type TaskInput = Omit<AIGenerationTask, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};

const MAX_TASKS = 50;

interface AIGenerationState {
  tasks: AIGenerationTask[];
  isPanelOpen: boolean;
  upsertTask: (task: TaskInput) => void;
  setTaskStatus: (
    id: string,
    status: AIGenerationTaskStatus,
    updates?: Partial<Pick<AIGenerationTask, 'title' | 'description' | 'error'>>,
  ) => void;
  setPanelOpen: (isOpen: boolean) => void;
  clearSettledTasks: () => void;
}

export const useAIGenerationStore = create<AIGenerationState>((set) => ({
  tasks: [],
  isPanelOpen: false,
  upsertTask: (task) =>
    set((state) => {
      const now = Date.now();
      const existing = state.tasks.find((item) => item.id === task.id);
      if (!existing) {
        const next = [
          {
            ...task,
            createdAt: task.createdAt ?? now,
            updatedAt: task.updatedAt ?? now,
          },
          ...state.tasks,
        ];
        // Keep at most MAX_TASKS, dropping oldest settled tasks first (FIFO by updatedAt)
        if (next.length > MAX_TASKS) {
          const settled = next
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => t.status === 'done' || t.status === 'failed')
            .sort((a, b) => a.t.updatedAt - b.t.updatedAt);
          const toRemove = new Set(settled.slice(0, next.length - MAX_TASKS).map(({ i }) => i));
          return { tasks: next.filter((_, i) => !toRemove.has(i)) };
        }
        return { tasks: next };
      }

      return {
        tasks: state.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                ...task,
                createdAt: item.createdAt,
                updatedAt: task.updatedAt ?? now,
              }
            : item,
        ),
      };
    }),
  setTaskStatus: (id, status, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...(updates?.title !== undefined ? { title: updates.title } : {}),
              ...(updates?.description !== undefined ? { description: updates.description } : {}),
              ...(updates?.error !== undefined ? { error: updates.error } : {}),
              status,
              updatedAt: Date.now(),
            }
          : task,
      ),
    })),
  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
  clearSettledTasks: () =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status === 'queued' || task.status === 'running'),
    })),
}));
