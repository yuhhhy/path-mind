import { queryOptions } from '@tanstack/react-query';
import { getGoal, getGoals, getStepVerification } from './api';

export const goalsQueryOptions = () =>
  queryOptions({
    queryKey: ['goals'],
    queryFn: getGoals,
  });

export const goalQueryOptions = (goalId: string) =>
  queryOptions({
    queryKey: ['goal', goalId],
    queryFn: () => getGoal(goalId),
    retry: false,
  });

export const stepVerificationQueryOptions = (stepId: string) =>
  queryOptions({
    queryKey: ['step-verification', stepId],
    queryFn: () => getStepVerification(stepId),
    retry: false,
  });
