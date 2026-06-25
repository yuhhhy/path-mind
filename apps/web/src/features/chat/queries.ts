import { queryOptions } from '@tanstack/react-query';
import { getChatSession } from './api';

export const chatSessionQueryOptions = (goalId: string, stepId: string) =>
  queryOptions({
    queryKey: ['chat-session', goalId, stepId],
    queryFn: () => getChatSession(goalId, stepId),
  });
