import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { useAIGenerationStore } from '../ai-generation/aiGenerationStore';
import type { ChatMessage, Goal, LearningStep } from '../goal/types';
import { streamChatSession } from './api';
import { chatSessionQueryOptions } from './queries';

// Lazy-load to split shiki/rehype-pretty-code out of the main bundle
const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })),
);

interface ChatPanelProps {
  goal: Goal;
  step: LearningStep;
}

export function ChatPanel({ goal, step }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const chatOptions = useMemo(() => chatSessionQueryOptions(goal.id, step.id), [goal.id, step.id]);
  const [messages, setMessages] = useState<ChatMessage[]>(
    () =>
      queryClient.getQueryData<{ messages: ChatMessage[] }>(chatOptions.queryKey)?.messages ?? [],
  );
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const autoStartKeyRef = useRef('');
  const upsertTask = useAIGenerationStore((state) => state.upsertTask);
  const setTaskStatus = useAIGenerationStore((state) => state.setTaskStatus);
  const setPanelOpen = useAIGenerationStore((state) => state.setPanelOpen);

  const chatQuery = useQuery(chatOptions);

  useEffect(() => {
    if (!isStreaming && chatQuery.data) {
      setMessages(chatQuery.data.messages);
    }
  }, [chatQuery.data, isStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const statusLabel =
    step.status === 'done' ? '已完成' : step.status === 'learning' ? '学习中' : '待开始';

  const appendAssistantDelta = useCallback((content: string) => {
    setMessages((current) => {
      const next = [...current];
      const lastMessage = next.at(-1);

      if (lastMessage?.role === 'assistant') {
        next[next.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + content,
          status: 'streaming',
        };
        return next;
      }

      return [...next, { role: 'assistant', content, status: 'streaming' }];
    });
  }, []);

  const completeLastAssistantMessage = useCallback(() => {
    setMessages((current) => {
      const next = [...current];
      const lastMessage = next.at(-1);
      if (lastMessage?.role !== 'assistant') return current;
      next[next.length - 1] = { ...lastMessage, status: 'complete' };
      return next;
    });
  }, []);

  const runSession = useCallback(
    async (
      history: ChatMessage[],
      options: { userMessage?: string; silentUserMessage?: string } = {},
    ) => {
      abortRef.current?.abort();

      const abortController = new AbortController();
      const visibleMessages = options.userMessage
        ? [...history, { role: 'user' as const, content: options.userMessage }]
        : history;
      const streamingAssistant = visibleMessages.findLast(
        (message) => message.role === 'assistant' && message.status === 'streaming' && message.id,
      );
      const taskId = `step:${step.id}:teaching`;
      const taskTitle = options.userMessage ? '生成 AI 追问回复' : '生成 AI 教学讲解';
      const shouldReuseStreamingAssistant =
        visibleMessages.at(-1)?.role === 'assistant' &&
        visibleMessages.at(-1)?.status === 'streaming';

      abortRef.current = abortController;
      setError('');
      setIsStreaming(true);
      setMessages(
        shouldReuseStreamingAssistant
          ? visibleMessages
          : [...visibleMessages, { role: 'assistant', content: '', status: 'streaming' }],
      );
      upsertTask({
        id: taskId,
        title: taskTitle,
        status: 'running',
        scope: { goalId: goal.id, stepId: step.id },
      });
      setPanelOpen(true);

      streamChatSession(
        {
          goal,
          step,
          messages: history,
          userMessage: options.userMessage,
          silentUserMessage: options.silentUserMessage,
          continueAssistantMessageId: streamingAssistant?.id,
        },
        {
          onDelta(content) {
            appendAssistantDelta(content);
          },
          onDone() {
            setIsStreaming(false);
            completeLastAssistantMessage();
            setTaskStatus(taskId, 'done', { title: `${taskTitle}完成` });
            void queryClient.invalidateQueries({ queryKey: chatOptions.queryKey });
          },
          onError(streamError) {
            setError(streamError.message || 'AI 服务暂时不可用，请检查后端服务或 API Key。');
            setIsStreaming(false);
            setTaskStatus(taskId, 'failed', {
              error: streamError.message || 'AI 教学生成失败',
            });
          },
        },
        abortController.signal,
      );
    },
    [
      appendAssistantDelta,
      chatOptions.queryKey,
      completeLastAssistantMessage,
      goal,
      queryClient,
      setPanelOpen,
      setTaskStatus,
      step,
      upsertTask,
    ],
  );

  useEffect(() => {
    if (chatQuery.isLoading || isStreaming || !chatQuery.data) return;

    const currentKey = `${goal.id}:${step.id}`;
    if (autoStartKeyRef.current === currentKey) return;

    const persistedMessages = chatQuery.data.messages;
    const hasCompleteAssistantReply = persistedMessages.some(
      (message) =>
        message.role === 'assistant' &&
        message.status !== 'streaming' &&
        message.content.trim().length > 0,
    );
    if (hasCompleteAssistantReply) return;

    const startTimer = window.setTimeout(() => {
      autoStartKeyRef.current = currentKey;
      if (persistedMessages.length > 0) {
        void runSession(persistedMessages);
      } else {
        void runSession([], { silentUserMessage: `请开始当前 Step「${step.title}」的教学。` });
      }
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      autoStartKeyRef.current = '';
    };
  }, [chatQuery.data, chatQuery.isLoading, goal.id, isStreaming, runSession, step.id, step.title]);

  const handleStart = () => {
    void runSession([], { silentUserMessage: `请开始当前 Step「${step.title}」的教学。` });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isStreaming) {
      return;
    }

    const history = messages.filter((message) => message.content.trim().length > 0);
    setDraft('');
    void runSession(history, { userMessage: content });
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
        {chatQuery.isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            正在读取历史教学内容...
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-800">准备开始本节 AI 教学</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              AI 会围绕当前 Goal 和 Step 分段讲解，并在合适的时候给你一个小问题。
            </p>
            <Button
              className="mt-4 justify-center px-3.5"
              disabled={isStreaming}
              onClick={handleStart}
              size="md"
            >
              {isStreaming ? '生成中...' : '开始 AI 教学'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                className={
                  message.role === 'user'
                    ? 'my-8 rounded-lg border border-orange-100 bg-orange-50 px-4 py-4 text-sm leading-6 text-orange-900'
                    : 'px-1 py-3 text-sm text-gray-700'
                }
                key={`${message.role}-${index}`}
              >
                {message.role === 'assistant' ? (
                  message.content ? (
                    <Suspense fallback={<p className="text-gray-400">渲染中...</p>}>
                      <MarkdownRenderer content={message.content} />
                    </Suspense>
                  ) : (
                    <p className="text-gray-400">AI 正在组织讲解...</p>
                  )
                ) : (
                  <>
                    <p className="text-sm font-semibold text-orange-950">我的追问</p>
                    <p className="mt-3 whitespace-pre-wrap">{message.content}</p>
                  </>
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
            <Button
              className="justify-center"
              disabled={isStreaming || draft.trim().length === 0}
              size="md"
              type="submit"
            >
              {isStreaming ? '回复中' : '发送'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
