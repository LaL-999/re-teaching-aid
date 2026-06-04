import path from 'node:path';
import dotenv from 'dotenv';

// server/.env （src 的上一级即 server 根目录；构建到 dist 后同样成立）
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const serverRoot = path.resolve(__dirname, '..');

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim();
}

export const config = {
  port: num('PORT', 4000),
  clientOrigin: str('CLIENT_ORIGIN', 'http://localhost:5173'),
  jwt: {
    secret: str('JWT_SECRET', 'dev-secret-please-change'),
    expiresIn: str('JWT_EXPIRES_IN', '12h'),
  },
  llm: {
    baseUrl: str('LLM_BASE_URL', ''),
    apiKey: process.env.LLM_API_KEY?.trim() ?? '',
    model: str('LLM_MODEL', 'deepseek-chat'),
    timeoutMs: num('LLM_TIMEOUT_MS', 30000),
  },
  krokiServer: str('KROKI_SERVER', 'https://kroki.io').replace(/\/$/, ''),
  plantumlServer: str('PLANTUML_SERVER', 'https://www.plantuml.com/plantuml').replace(/\/$/, ''),
  paths: {
    dataDir: path.join(serverRoot, 'data'),
    uploadsDir: path.join(serverRoot, 'uploads'),
    dbFile: path.join(serverRoot, 'data', 'app.db'),
  },
} as const;

/** 是否已配置真实大模型；否则全部 AI 工具走离线 Mock。 */
export const isLlmConfigured: boolean = Boolean(config.llm.apiKey && config.llm.baseUrl);
