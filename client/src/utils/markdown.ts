/**
 * 极简、零依赖、XSS 安全的 Markdown → HTML（仅 body 片段）。
 * 与服务端 server/src/modules/ai/markdown.ts 保持同一套规则，供前端内联渲染流水线产物。
 * 所有文本先 HTML 转义再套用有限标签，避免注入；故渲染结果可安全用于 dangerouslySetInnerHTML。
 */

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

/** Markdown → 安全的 HTML body 片段。 */
export function markdownToSafeHtml(markdown: string): string {
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
