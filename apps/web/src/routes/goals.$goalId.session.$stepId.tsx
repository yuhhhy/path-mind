import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ChatPanel } from '../features/chat/ChatPanel';
import { completeStep } from '../features/goal/api';
import { mockGoals } from '../features/goal/mockGoals';
import { goalQueryOptions, goalsQueryOptions } from '../features/goal/queries';

export const Route = createFileRoute('/goals/$goalId/session/$stepId')({
  component: LearningSessionPage,
});

function LearningSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { goalId, stepId } = Route.useParams();
  const fallbackGoal = mockGoals.find((item) => item.id === goalId);
  const goalOptions = goalQueryOptions(goalId);
  const goalsOptions = goalsQueryOptions();
  const goalQuery = useQuery(goalOptions);
  const goal = goalQuery.data ?? (goalQuery.isError ? fallbackGoal : undefined);
  const completeStepMutation = useMutation({
    mutationFn: () => completeStep(goalId, stepId),
    onSuccess(updatedGoal) {
      queryClient.setQueryData(goalOptions.queryKey, updatedGoal);
      void queryClient.invalidateQueries({ queryKey: goalsOptions.queryKey });
      void navigate({ to: '/goals/$goalId', params: { goalId: updatedGoal.id } });
    },
  });
  const step = goal?.steps.find((item) => item.id === stepId);

  if (!goal || !step) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">没有找到这个学习 Session。</p>
        <Link
          className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          to="/"
        >
          返回工作台
        </Link>
      </div>
    );
  }

  const handleCompleteStep = () => {
    completeStepMutation.mutate();
  };

  const completedSteps = goal.steps.filter((s) => s.status === 'done').length;
  const nextStep = goal.steps.find((s) => s.status === 'todo');
  const assessmentLabel: Record<string, string> = {
    quiz: '测验',
    teach_back: '复述验证',
    practice_task: '实践任务',
    interview_question: '面试题验证',
  };

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        to="/goals/$goalId"
        params={{ goalId: goal.id }}
      >
        <ArrowLeft size={15} />
        返回目标
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <ChatPanel goal={goal} step={step} />

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">当前进度</p>
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 truncate pr-2">{goal.title}</span>
                <span className="shrink-0 text-gray-500">{goal.progress}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: goal.progress + '%' }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {completedSteps}/{goal.steps.length} 步完成
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">验证方式</p>
            <p className="mt-1.5 text-sm text-gray-600">
              {goal.learningConfig.assessmentMethods.map((m) => assessmentLabel[m] ?? m).join('、')}
            </p>
          </div>

          {nextStep && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">下一步</p>
              <p className="mt-1.5 text-sm font-medium text-gray-800">{nextStep.title}</p>
            </div>
          )}

          <button
            className="inline-flex w-full h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            disabled={step.status === 'done'}
            onClick={handleCompleteStep}
            type="button"
          >
            <CheckCircle2 size={15} />
            {step.status === 'done' ? '已完成' : '标记本节完成'}
          </button>
        </aside>
      </div>
    </div>
  );
}
