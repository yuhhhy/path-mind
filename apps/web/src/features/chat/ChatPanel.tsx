import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, Goal, LearningStep } from '../goal/types';
import { streamChatSession } from './api';

interface ChatPanelProps {
  goal: Goal;
  step: LearningStep;
}

export function ChatPanel({ goal, step }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const statusLabel =
    step.status === 'done' ? '已完成' : step.status === 'learning' ? '学习中' : '待开始';

  const appendAssistantDelta = (content: string) => {
    setMessages((current) => {
      const next = [...current];
      const lastMessage = next.at(-1);

      if (lastMessage?.role === 'assistant') {
        next[next.length - 1] = { ...lastMessage, content: lastMessage.content + content };
        return next;
      }

      return [...next, { role: 'assistant', content }];
    });
  };

  const runSession = async (nextMessages: ChatMessage[]) => {
    abortRef.current?.abort();

    const abortController = new AbortController();
    abortRef.current = abortController;
    setError('');
    setIsStreaming(true);
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);

    await streamChatSession(
      { goal, step, messages: nextMessages },
      {
        onDelta(content) {
          appendAssistantDelta(content);
        },
        onDone() {
          setIsStreaming(false);
        },
        onError(streamError) {
          setError(streamError.message || 'AI 服务暂时不可用，请检查后端服务或 API Key。');
          setIsStreaming(false);
        },
      },
      abortController.signal,
    );
  };

  const handleStart = () => {
    void runSession([
      {
        role: 'user',
        content: `请开始当前 Step「${step.title}」的教学。`,
      },
    ]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isStreaming) {
      return;
    }

    setDraft('');
    void runSession([...messages, { role: 'user', content }]);
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-5 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {statusLabel}
          </span>
          <span className="text-xs text-gray-400">{goal.title}</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">{step.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.description}</p>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-800">准备开始本节 AI 教学</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              AI 会围绕当前 Goal 和 Step 分段讲解，并在合适的时候给你一个小问题。
            </p>
            <button
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isStreaming}
              onClick={handleStart}
              type="button"
            >
              {isStreaming ? '生成中...' : '开始 AI 教学'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                className={
                  message.role === 'user'
                    ? 'rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950'
                    : 'rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-7 text-gray-700 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_table]:mt-3 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-200 [&_th]:px-2 [&_th]:py-1'
                }
                key={`${message.role}-${index}`}
              >
                {message.role === 'assistant' ? (
                  message.content ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-400">AI 正在组织讲解...</p>
                  )
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {messages.length > 0 && (
          <form className="flex gap-2 border-t border-gray-100 pt-4" onSubmit={handleSubmit}>
            <input
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
              disabled={isStreaming}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="追问一句，比如：这里为什么需要 DNS？"
              value={draft}
            />
            <button
              className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isStreaming || draft.trim().length === 0}
              type="submit"
            >
              {isStreaming ? '回复中' : '发送'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
