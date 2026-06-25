export interface StepProgressInput {
  id: string;
  status: string;
}

export function completeStepProgress(steps: StepProgressInput[], stepId: string) {
  const completedCandidate = steps.map((step) =>
    step.id === stepId ? { ...step, status: 'done' } : step,
  );
  const nextTodoIndex = completedCandidate.findIndex((step) => step.status === 'todo');
  const nextSteps = completedCandidate.map((step, index) =>
    index === nextTodoIndex ? { ...step, status: 'learning' } : step,
  );
  const completedCount = nextSteps.filter((step) => step.status === 'done').length;
  const progress =
    nextSteps.length === 0 ? 0 : Math.round((completedCount / nextSteps.length) * 100);

  return {
    steps: nextSteps,
    progress,
    goalStatus: progress === 100 ? 'completed' : 'active',
  };
}
