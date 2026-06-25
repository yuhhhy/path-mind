import ReactMarkdown from 'react-markdown';
import type { Goal, LearningStep } from '../goal/types';

interface ChatPanelProps {
  goal: Goal;
  step: LearningStep;
}

const demoReply = `
我们先把这一节放进完整链路里看：输入 URL 后，浏览器不是直接拿到 HTML，而是先把“我要访问哪里”变成一次真实的网络请求。

**这一节你要抓住三个顺序：**

1. URL 解析，确认协议、域名、端口和路径。
2. DNS 查询，把域名解析成服务器 IP。
3. 建立连接，再发出 HTTP 请求并等待响应。

学完后，你应该能用自己的话解释：为什么 DNS、TCP、TLS、HTTP 不是一回事，但它们会连续出现在同一条访问链路里。
`;

export function ChatPanel({ goal, step }: ChatPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <p className="text-sm font-medium text-sky-700">AI Learning Session</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{step.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{goal.title}</p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="max-w-3xl rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-700">
          我想学习：{step.description}
        </div>
        <div className="max-w-3xl rounded-lg bg-sky-50 p-4 text-sm leading-6 text-slate-700">
          <ReactMarkdown>{demoReply}</ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
