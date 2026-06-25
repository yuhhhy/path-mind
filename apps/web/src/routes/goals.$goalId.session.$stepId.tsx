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
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-slate-600">没有找到这个学习 Session。</p>
        <Link className="mt-4 inline-flex text-sm font-medium text-sky-700" to="/">
          返回 Dashboard
        </Link>
      </div>
    );
  }

  const handleCompleteStep = () => {
    completeStep(goal.id, step.id);
    void navigate({ to: '/goals/$goalId', params: { goalId: goal.id } });
  };

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        to="/goals/$goalId"
        params={{ goalId: goal.id }}
      >
        <ArrowLeft size={16} />
        返回 Goal
      </Link>

      <ChatPanel goal={goal} step={step} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">完成这一节了吗？</p>
            <p className="mt-1 text-sm text-slate-500">
              点击后会把 Step 标记为 done，并重新计算 Goal 进度。
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={step.status === 'done'}
            onClick={handleCompleteStep}
            type="button"
          >
            <CheckCircle2 size={16} />
            {step.status === 'done' ? '已完成' : '标记 Step 完成'}
          </button>
        </div>
      </section>
    </div>
  );
}
