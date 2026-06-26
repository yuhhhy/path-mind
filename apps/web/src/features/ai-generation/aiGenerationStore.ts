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
        return {
          tasks: [
            {
              ...task,
              createdAt: task.createdAt ?? now,
              updatedAt: task.updatedAt ?? now,
            },
            ...state.tasks,
          ],
        };
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
              ...updates,
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
