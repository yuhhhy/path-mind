import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getWorkflowSession, sendWorkflowMessage } from '../features/workflow/api';
import type { WorkflowRunResult } from '../features/workflow/types';
import { sessionsQueryOptions, WorkflowWorkspace } from './workflow';

export const Route = createFileRoute('/workflow/$sessionId')({
  component: WorkflowSessionPage,
});

const sessionQueryKey = (sessionId: string) => ['workflow', 'sessions', sessionId] as const;
const sessionQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: sessionQueryKey(sessionId),
    queryFn: () => getWorkflowSession(sessionId),
  });

function WorkflowSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const sessionQuery = useQuery(sessionQueryOptions(sessionId));
  const sendMutation = useMutation({
    mutationFn: (content: string) => sendWorkflowMessage(sessionId, content),
    onSuccess(result) {
      queryClient.setQueryData<WorkflowRunResult>(sessionQueryKey(sessionId), result);
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: sessionsQueryOptions().queryKey });
    },
  });

  if (sessionQuery.isPending) {
    return <p className="py-12 text-sm text-slate-500">正在加载 Workflow 历史…</p>;
  }

  if (sessionQuery.isError) {
    return (
      <div className="py-12">
        <h1 className="text-lg font-semibold text-slate-900">无法打开这个 Workflow</h1>
        <p className="mt-2 text-sm text-red-600">{sessionQuery.error.message}</p>
        <button
          className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-700"
          onClick={() => void navigate({ to: '/workflow' })}
          type="button"
        >
          返回 Workflow 列表
        </button>
      </div>
    );
  }

  return (
    <WorkflowWorkspace
      draft={draft}
      error={sendMutation.error}
      isSending={sendMutation.isPending}
      onDraftChange={setDraft}
      onNew={() => void navigate({ to: '/workflow' })}
      onSend={() => {
        if (draft.trim()) sendMutation.mutate(draft.trim());
      }}
      run={sessionQuery.data}
    />
  );
}
