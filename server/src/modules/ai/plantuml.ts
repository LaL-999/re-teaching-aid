import plantumlEncoder from 'plantuml-encoder';
import { config } from '../../config';
import { AppError } from '../../middleware/error';

/**
 * 从 Kroki/PlantUML 的错误响应中提炼简洁的中文可读原因。
 * Kroki 出错时可能返回纯文本，也可能返回一张「错误 SVG 图」——后者真正的
 * 错误文字藏在 <text> 节点里，需提取出来，避免把整段 SVG 原文回显给用户。
 */
function extractErrorReason(body: string, status: number): string {
  const trimmed = body.trim();
  if (trimmed.startsWith('<')) {
    const texts = [...trimmed.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
      .map((m) => m[1]!.trim())
      .filter(Boolean);
    if (texts.length > 0) {
      return texts.join(' ').slice(0, 200);
    }
    return `PlantUML 语法有误，请检查（如缺少 @startuml/@enduml 或元素定义）。`;
  }
  return (trimmed || `渲染服务返回 ${status}`).slice(0, 200);
}

/** 生成「在新标签打开」用的 PlantUML 编码 GET 链接。 */
export function encodePlantumlUrl(code: string, format: 'svg' | 'png' = 'svg'): string {
  const encoded = plantumlEncoder.encode(code);
  return `${config.plantumlServer}/${format}/${encoded}`;
}

/**
 * 通过 Kroki POST 将 PlantUML 渲染为 SVG。
 * 语法错误时 Kroki 返回非 2xx，错误信息在响应体中 → 抛 422「编译失败」。
 */
export async function renderPlantumlSvg(code: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${config.krokiServer}/plantuml/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Accept: 'image/svg+xml' },
      body: code,
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new AppError(422, `编译失败：${extractErrorReason(body, response.status)}`);
    }
    return body;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, '图形渲染超时，请稍后重试');
    }
    throw new AppError(502, '图形渲染服务暂时不可用，请稍后重试');
  } finally {
    clearTimeout(timer);
  }
}
