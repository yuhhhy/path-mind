import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { MarkdownMessage } from '../MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders basic Markdown as HTML instead of plain text', () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage content={'## 标题\n\n- 条目\n\n| A | B |\n| - | - |\n| 1 | 2 |'} />,
    );

    expect(html).toContain('<h2');
    expect(html).toContain('<li');
    expect(html).toContain('<table');
  });
});
