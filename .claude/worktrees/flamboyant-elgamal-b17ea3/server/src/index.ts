import { config, isLlmConfigured } from './config';
import { createApp } from './app';
import { getDb } from './db';
import { seedDatabase, seedHomeworkIfEmpty } from './db/seed';

function bootstrap(): void {
  // 初始化数据库（建表）并在为空时写入种子数据
  getDb();
  const { seeded } = seedDatabase();
  seedHomeworkIfEmpty();

  const app = createApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`✅ API 运行于 http://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(
      `   AI 模式：${
        isLlmConfigured ? `真实大模型（${config.llm.model}）` : '离线 Mock（未配置 LLM_API_KEY）'
      }`,
    );
    if (seeded) {
      // eslint-disable-next-line no-console
      console.log('   已写入初始种子数据（教师 2024001 / 123456）。');
    }
  });
}

bootstrap();
