import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Clock, FolderOpen, Plus, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { initGoal } from '../features/goal/api';
import { mockGoals } from '../features/goal/mockGoals';
import { goalsQueryOptions } from '../features/goal/queries';
import type { GenerateLearningPathInput } from '../features/goal/types';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

const typeLabel: Record<string, string> = {
  understand_concept: '理解概念',
  prepare_interview: '面试准备',
  build_project: '构建项目',
  pass_exam: '通过考试',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: '进行中', className: 'text-slate-700 bg-slate-100' },
  completed: { label: '已完成', className: 'text-green-700 bg-green-50' },
  paused: { label: '已暂停', className: 'text-slate-500 bg-slate-100' },
};

const DEFAULT_GOAL_TITLE = '学会从输入 URL 到浏览器渲染';

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goalsOptions = goalsQueryOptions();
  const goalsQuery = useQuery(goalsOptions);
  const goals = goalsQuery.data ?? (goalsQuery.isError ? mockGoals : []);

  const [goalTitle, setGoalTitle] = useState(DEFAULT_GOAL_TITLE);

  const createGoalMutation = useMutation({
    mutationFn: (title: string) => {
      const input: GenerateLearningPathInput = {
        goalTitle: title.trim() || DEFAULT_GOAL_TITLE,
        goalType: 'understand_concept',
        learningConfig: {
          teachingStrategy: 'first_principles',
          preferredOutputFormats: ['flowchart', 'text'],
          assessmentMethods: ['teach_back', 'interview_question'],
        },
      };
      return initGoal(input);
    },
    onSuccess({ goalId }) {
      void queryClient.invalidateQueries({ queryKey: goalsOptions.queryKey });
      void navigate({ to: '/goals/$goalId', params: { goalId } });
    },
  });

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">工作台</h1>
        <p className="mt-1 text-sm text-slate-500">
          围绕目标规划路径、完成学习步骤，并通过复述和练习验证理解。
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-800">用 AI 生成学习路径</p>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 disabled:bg-slate-50"
              disabled={createGoalMutation.isPending}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="输入你的学习目标…"
              value={goalTitle}
            />
            <button
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
              disabled={createGoalMutation.isPending || goalTitle.trim().length === 0}
              onClick={() => createGoalMutation.mutate(goalTitle)}
              type="button"
            >
              <Sparkles size={15} />
              {createGoalMutation.isPending ? '生成中...' : '生成'}
            </button>
          </div>
          {createGoalMutation.isError && (
            <p className="text-xs text-red-600">AI 服务暂时不可用，请检查后端服务或 API Key。</p>
          )}
        </div>
      </section>

      {/* Goal tracking section */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">目标追踪</h2>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            最近 7 天
          </span>
          <Link
            className="ml-auto text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
            to="/goals"
          >
            查看全部
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {goals.length === 0 ? (
            <div className="py-16 text-center">
              <Target size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">还没有学习目标</p>
              <p className="mt-1 text-xs text-slate-400">新建一个目标，开始你的学习之旅。</p>
              <div className="mt-5 flex items-center justify-center">
                <Link
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  to="/goals"
                >
                  + 新建目标
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                    目标名称
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                    完成步骤
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">进度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">状态</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {goals.map((goal, idx) => {
                  const done = goal.steps.filter((s) => s.status === 'done').length;
                  const status = statusConfig[goal.status] ?? statusConfig.paused;
                  return (
                    <tr
                      key={goal.id}
                      className={idx < goals.length - 1 ? 'border-b border-slate-100' : ''}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">{goal.title}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {typeLabel[goal.type] ?? goal.type}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded bg-slate-100 px-1.5 text-xs font-medium text-slate-600">
                          {done}
                        </span>
                        <span className="ml-1.5 text-slate-400">/ {goal.steps.length}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-400 transition-all"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{goal.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                          params={{ goalId: goal.id }}
                          to="/goals/$goalId"
                        >
                          继续学习
                          <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* My data section */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">我的数据</h2>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-[12px] text-slate-400">上传文档，让 AI 基于你的资料学习</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="py-16 text-center">
            <FolderOpen size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">暂无上传的文档</p>
            <p className="mt-1 text-xs text-slate-400">
              上传 PDF、笔记等资料，AI 将基于内容为你出题和解析。
            </p>
            <div className="mt-5 flex items-center justify-center">
              <button
                className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                type="button"
              >
                <Plus size={12} />
                <span className="text-xs">上传文档</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
