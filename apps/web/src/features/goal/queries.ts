import { queryOptions } from '@tanstack/react-query';
import { getGoal, getGoals } from './api';

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
