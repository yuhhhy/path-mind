import { Suspense, lazy, memo } from 'react';

const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then((module) => ({ default: module.MarkdownRenderer })),
);

export const LazyMarkdownRenderer = memo(function LazyMarkdownRenderer({
  content,
}: {
  content: string;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">渲染中...</p>}>
      <MarkdownRenderer content={content} />
    </Suspense>
  );
});
