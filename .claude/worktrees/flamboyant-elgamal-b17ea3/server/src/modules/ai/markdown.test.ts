import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdown';

describe('markdownToHtml', () => {
  it('渲染标题与无序列表', () => {
    const html = markdownToHtml('# 标题\n\n- 甲\n- 乙');
    expect(html).toContain('<h1>标题</h1>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>甲</li>');
  });

  it('转义 HTML，防止脚本注入', () => {
    const html = markdownToHtml('正常文本 <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('渲染粗体与表格', () => {
    const html = markdownToHtml('这是 **重点**\n\n| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<strong>重点</strong>');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });
});
