import fs from 'node:fs';
import Database from 'better-sqlite3';
import { config } from '../config';
import { SCHEMA_SQL } from './schema';

let instance: Database.Database | null = null;

/**
 * 获取 SQLite 单例连接。首次调用时建库目录、开启外键、执行建表 SQL。
 * 持久层（repository）统一通过此函数取连接，便于未来替换底层实现。
 */
export function getDb(): Database.Database {
  if (instance) return instance;

  fs.mkdirSync(config.paths.dataDir, { recursive: true });

  const db = new Database(config.paths.dbFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  instance = db;
  return instance;
}

/** 仅供测试：关闭并丢弃当前连接。 */
export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
