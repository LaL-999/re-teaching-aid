import { useMemo } from 'react';
import { markdownToSafeHtml } from '../utils/markdown';

interface MarkdownViewProps {
  markdown: string;
  /** 最大高度，超出滚动；默认不限制 */
  maxHeight?: number | string;
}

/** 把 Markdown 安全渲染为带样式的内联视图（渲染器已做转义，无 XSS 风险）。 */
export function MarkdownView({ markdown, maxHeight }: MarkdownViewProps) {
  const html = useMemo(() => markdownToSafeHtml(markdown), [markdown]);
  return (
    <div
      className="markdown-body"
      style={maxHeight ? { maxHeight, overflow: 'auto' } : undefined}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
