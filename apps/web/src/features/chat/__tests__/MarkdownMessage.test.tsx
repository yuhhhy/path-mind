import { Suspense } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';

// highlight.js/styles CSS import is a no-op in the test environment
vi.mock('highlight.js/styles/github-dark.min.css', () => ({}));

const { MarkdownRenderer } = await import('../MarkdownRenderer');

const render = (content: string) =>
  renderToStaticMarkup(
    <Suspense fallback="">
      <MarkdownRenderer content={content} />
    </Suspense>,
  );

describe('MarkdownRenderer', () => {
  it('renders headings, lists and tables as HTML', () => {
    const html = render('## 标题\n\n- 条目\n\n| A | B |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<h2');
    expect(html).toContain('<li');
    expect(html).toContain('<table');
  });

  it('renders a fenced code block without crashing', () => {
    expect(() => render('```ts\nconst x = 1;\n```')).not.toThrow();
  });

  it('renders a table without crashing', () => {
    expect(() => render('| Col1 | Col2 |\n| --- | --- |\n| a | b |')).not.toThrow();
  });

  it('renders empty content without crashing', () => {
    expect(() => render('')).not.toThrow();
  });

  it('renders GFM strikethrough', () => {
    const html = render('~~删除线~~');
    expect(html).toContain('<del');
  });

  it('renders blockquotes without crashing', () => {
    expect(() => render('> 注意：这是一个提示块')).not.toThrow();
  });
});
