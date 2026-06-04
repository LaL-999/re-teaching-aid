/**
 * 极简、零依赖、XSS 安全的 Markdown → HTML 转换器。
 * 仅覆盖 SRS 文档所需子集：标题、列表、表格、引用、分隔线、粗体/斜体/行内代码、段落。
 * 所有模型输出的文本先 HTML 转义，再套用有限的格式标签，避免注入。
 */

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 行内格式：输入必须已转义。 */
function inline(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(header: string[], rows: string[][]): string {
  const head = header.map((h) => `<th>${inline(escapeHtml(h))}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderBody(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = (): void => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i]!.trimEnd();

    // 表格：当前行以 | 开头且下一行为分隔行
    if (/^\s*\|/.test(raw) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]!)) {
      closeLists();
      const header = splitRow(raw);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i]!)) {
        rows.push(splitRow(lines[i]!));
        i += 1;
      }
      out.push(renderTable(header, rows));
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(raw)) {
      closeLists();
      out.push('<hr/>');
      i += 1;
      continue;
    }

    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeLists();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(escapeHtml(heading[2]!))}</h${level}>`);
      i += 1;
      continue;
    }

    const quote = raw.match(/^>\s?(.*)$/);
    if (quote) {
      closeLists();
      out.push(`<blockquote>${inline(escapeHtml(quote[1]!))}</blockquote>`);
      i += 1;
      continue;
    }

    const ordered = raw.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inline(escapeHtml(ordered[1]!))}</li>`);
      i += 1;
      continue;
    }

    const unordered = raw.match(/^\s*[-*+]\s+(.*)$/);
    if (unordered) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${inline(escapeHtml(unordered[1]!))}</li>`);
      i += 1;
      continue;
    }

    if (raw.trim() === '') {
      closeLists();
      i += 1;
      continue;
    }

    closeLists();
    out.push(`<p>${inline(escapeHtml(raw))}</p>`);
    i += 1;
  }

  closeLists();
  return out.join('\n');
}

const DOC_STYLE = `
  body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; line-height: 1.7; color: #1f2329; max-width: 860px; margin: 32px auto; padding: 0 20px; }
  h1 { font-size: 26px; border-bottom: 2px solid #e5e6eb; padding-bottom: 10px; }
  h2 { font-size: 21px; border-bottom: 1px solid #e5e6eb; padding-bottom: 6px; margin-top: 28px; }
  h3 { font-size: 18px; margin-top: 22px; }
  h4 { font-size: 16px; color: #2c3142; }
  code { background: #f2f3f5; padding: 1px 5px; border-radius: 4px; font-size: 90%; }
  blockquote { border-left: 4px solid #c9cdd4; margin: 12px 0; padding: 4px 14px; color: #5a6066; background: #f7f8fa; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; }
  th, td { border: 1px solid #dcdfe6; padding: 8px 12px; text-align: left; }
  th { background: #f2f3f5; }
  hr { border: none; border-top: 1px solid #e5e6eb; margin: 24px 0; }
`;

/** 转为可独立查看 / 下载的完整 HTML 文档。 */
export function markdownToHtml(markdown: string): string {
  const body = renderBody(markdown);
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<title>软件需求规格说明书</title>',
    `<style>${DOC_STYLE}</style>`,
    '</head>',
    `<body>${body}</body>`,
    '</html>',
  ].join('\n');
}
