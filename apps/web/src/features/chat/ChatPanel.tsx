import ReactMarkdown from 'react-markdown';
import type { Goal, LearningStep } from '../goal/types';

interface ChatPanelProps {
  goal: Goal;
  step: LearningStep;
}

const demoReply = `
我们先把这一节放进完整链路里看：输入 URL 后，浏览器不是直接拿到 HTML，而是先把"我要访问哪里"变成一次真实的网络请求。

**这一节你要抓住三个顺序：**

1. URL 解析，确认协议、域名、端口和路径。
2. DNS 查询，把域名解析成服务器 IP。
3. 建立连接，再发出 HTTP 请求并等待响应。

学完后，你应该能用自己的话解释：为什么 DNS、TCP、TLS、HTTP 不是一回事，但它们会连续出现在同一条访问链路里。
`;

export function ChatPanel({ goal, step }: ChatPanelProps) {
  const statusLabel =
    step.status === 'done' ? '已完成' : step.status === 'learning' ? '学习中' : '待开始';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            {statusLabel}
          </span>
          <span className="text-xs text-slate-400">{goal.title}</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
      </div>

      <div className="space-y-4">
        <div className="max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
            学习意图
          </p>
          {step.description}
        </div>
        <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
            学习笔记
          </p>
          <ReactMarkdown>{demoReply}</ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
