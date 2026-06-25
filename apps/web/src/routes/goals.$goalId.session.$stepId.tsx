import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ChatPanel } from '../features/chat/ChatPanel';
import { useGoalStore } from '../features/goal/goalStore';

export const Route = createFileRoute('/goals/$goalId/session/$stepId')({
  component: LearningSessionPage,
});

function LearningSessionPage() {
  const navigate = useNavigate();
  const { goalId, stepId } = Route.useParams();
  const goal = useGoalStore((state) => state.getGoalById(goalId));
  const completeStep = useGoalStore((state) => state.completeStep);
  const step = goal?.steps.find((item) => item.id === stepId);

  if (!goal || !step) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">没有找到这个学习 Session。</p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-sky-700"
          to="/"
        >
          返回 Dashboard
        </Link>
      </div>
    );
  }

  const handleCompleteStep = () => {
    completeStep(goal.id, step.id);
    void navigate({ to: '/goals/$goalId', params: { goalId: goal.id } });
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
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        to="/goals/$goalId"
        params={{ goalId: goal.id }}
      >
        <ArrowLeft size={16} />
        返回 Goal
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <ChatPanel goal={goal} step={step} />

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">当前进度</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{goal.title}</span>
                <span className="text-slate-500">{goal.progress}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all duration-500"
                  style={{ width: goal.progress + '%' }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {completedSteps}/{goal.steps.length} 步完成
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">验证方式</p>
            <p className="mt-1 text-sm text-slate-600">
              {goal.learningConfig.assessmentMethods.map((m) => assessmentLabel[m] ?? m).join('、')}
            </p>
          </div>

          {nextStep && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">下一步</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{nextStep.title}</p>
            </div>
          )}

          <button
            className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 hover:border-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={step.status === 'done'}
            onClick={handleCompleteStep}
            type="button"
          >
            <CheckCircle2 size={16} />
            {step.status === 'done' ? '已完成' : '标记本节完成'}
          </button>
        </aside>
      </div>
    </div>
  );
}
