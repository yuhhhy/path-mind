import { common } from 'lowlight';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const components: Components = {
  // Dark code block container — not-prose prevents Typography from overriding it
  pre({ children, ...props }) {
    return (
      <pre
        {...props}
        className="not-prose my-4 overflow-x-auto rounded-lg border border-slate-700 bg-[#0d1117] p-4 text-[0.8125rem] leading-6"
      >
        {children}
      </pre>
    );
  },

  // rehype-highlight marks block code with class "hljs language-*".
  // Inline code has no className — apply the sky-tinted pill style only there.
  code({ className, children, ...props }) {
    const isBlock = className?.includes('hljs') || className?.startsWith('language-');
    if (isBlock) {
      return (
        <code {...props} className={className}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[0.875em] text-sky-700">
        {children}
      </code>
    );
  },

  // Table needs overflow wrapper to prevent breaking the chat layout
  table({ children }) {
    return (
      <div className="not-prose my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border border-slate-200 px-3 py-2 text-slate-700">{children}</td>;
  },

  // Blockquote as a tip/callout block with colored left border and tinted background
  blockquote({ children }) {
    return (
      <blockquote className="not-prose my-4 rounded-r-md border-l-[3px] border-blue-400 bg-blue-50/60 px-4 py-3 text-sm text-slate-600 [&_p]:my-1 [&_p]:leading-7">
        {children}
      </blockquote>
    );
  },
};

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [
  [rehypeHighlight, { languages: common, detect: true }],
  rehypeKatex,
] as Parameters<typeof ReactMarkdown>[0]['rehypePlugins'];

// LLMs output various math delimiters; remark-math only reads $$ (block) and $ (inline).
// remark-math rejects "$ content $" when there's a space after $, so we must trim.
function normalizeMathDelimiters(content: string): string {
  return (
    content
      // \[...\] → $$ block (trim surrounding whitespace so $$ is flush with content)
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => `\n$$\n${math.trim()}\n$$\n`)
      // \(...\) → $ inline (trim spaces LLMs add inside delimiters, e.g. \( P \) → $P$)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => `$${math.trim()}$`)
      // lone $ on its own line used as block fence → $$
      .replace(/^\$$/gm, '$$')
  );
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div
      className={[
        'prose prose-sm max-w-none',
        // Headings: keep sizes modest — these are in a chat bubble, not a page title
        'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:text-slate-900',
        'prose-h1:mt-0 prose-h1:text-[1.1rem]',
        'prose-h2:mt-5 prose-h2:text-base',
        'prose-h3:text-[0.9375rem]',
        // Body text
        'prose-p:leading-7 prose-p:text-slate-700',
        'prose-li:text-slate-700',
        'prose-strong:text-slate-900',
        'prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
        // Inline code: remove the backtick quotes Typography injects via content
        'prose-code:before:content-none prose-code:after:content-none',
        // Blockquote handled by component override
        'prose-blockquote:not-italic',
      ].join(' ')}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {normalizeMathDelimiters(content)}
      </ReactMarkdown>
    </div>
  );
}
