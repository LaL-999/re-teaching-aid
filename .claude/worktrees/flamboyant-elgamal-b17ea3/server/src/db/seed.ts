import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { getDb, closeDb } from './index';
import { config } from '../config';

interface SeedModule {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
}

interface SeedUser {
  studentId: string;
  name: string;
  role: 'teacher' | 'student';
  password: string;
}

/**
 * 六大教学模块——采用验收场景中的章节式标签（M1 需求工程概述、M2 需求获取——访谈）。
 * 其中 M1/M2 与验收场景标签完全一致；为容纳「概述」一章，原正文的「需求优先级」并入
 * 「需求管理」（优先级本属管理活动）。如需调整命名或拆分，仅修改此数组即可。
 */
const MODULES: SeedModule[] = [
  { code: 'M1', name: '需求工程概述', description: '需求工程的定义、价值、全流程与基本概念导入。', sortOrder: 1 },
  { code: 'M2', name: '需求获取——访谈', description: '访谈、问卷、观察、原型等需求获取技术，重点讲解访谈。', sortOrder: 2 },
  { code: 'M3', name: '需求建模', description: 'i* 目标建模、用例图、活动图、类图等建模方法。', sortOrder: 3 },
  { code: 'M4', name: '需求验证与确认', description: '需求评审、原型验证、测试用例等 V&V 手段。', sortOrder: 4 },
  { code: 'M5', name: '需求管理', description: '需求基线、变更控制、可追溯性，以及 MoSCoW/Kano 等优先级排序。', sortOrder: 5 },
  { code: 'M6', name: '需求规格说明书', description: 'SRS 编写规范与 GB/T 9385 国家标准。', sortOrder: 6 },
];

/** 种子账号。教师 2024001/123456 对应验收场景；另备两名学生用于学生端演示。 */
const USERS: SeedUser[] = [
  { studentId: '2024001', name: '张老师', role: 'teacher', password: '123456' },
  { studentId: '2024100', name: '李同学', role: 'student', password: '123456' },
  { studentId: '2024101', name: '王同学', role: 'student', password: '123456' },
];

/** 一份可直接预览的演示资源（txt），挂在 M1 下，用于演示「浏览/预览」。 */
const DEMO_RESOURCE = {
  moduleCode: 'M1',
  name: '第1章 需求工程概述',
  description: '课程导入：需求工程的定义、价值与全流程概览（演示用文本资源）。',
  originalFilename: '第1章 需求工程概述.txt',
  storedFilename: 'seed-demo-intro.txt',
  mimeType: 'text/plain; charset=utf-8',
  ext: 'txt',
  content: [
    '需求工程概述',
    '================',
    '',
    '一、什么是需求工程',
    '需求工程（Requirements Engineering）是指在软件开发过程中，对系统需求进行',
    '获取、分析、规格说明、验证与管理的一系列系统化活动。',
    '',
    '二、为什么重要',
    '据统计，需求阶段引入的缺陷若遗留到后期修复，成本可放大数十倍。清晰、准确、',
    '可验证的需求是项目成功的基石。',
    '',
    '三、核心活动',
    '1. 需求获取（Elicitation）：访谈、问卷、观察、原型……',
    '2. 需求建模（Modeling）：i*、用例图、活动图、类图……',
    '3. 需求验证与确认（V&V）：评审、原型、测试用例……',
    '4. 需求管理（Management）：基线、变更控制、可追溯性……',
    '',
    '——本文件由系统种子数据生成，仅用于功能演示。',
  ].join('\n'),
};

function insertDemoResource(db: Database.Database): void {
  fs.mkdirSync(config.paths.uploadsDir, { recursive: true });
  const buffer = Buffer.from(DEMO_RESOURCE.content, 'utf-8');
  const absolutePath = path.join(config.paths.uploadsDir, DEMO_RESOURCE.storedFilename);
  fs.writeFileSync(absolutePath, buffer);

  const moduleRow = db
    .prepare('SELECT id FROM modules WHERE code = ?')
    .get(DEMO_RESOURCE.moduleCode) as { id: number } | undefined;
  const teacherRow = db
    .prepare("SELECT id FROM users WHERE role = 'teacher' ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  if (!moduleRow || !teacherRow) return;

  db.prepare(
    `INSERT INTO resources
       (module_id, name, description, original_filename, stored_filename, mime_type, ext, size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    moduleRow.id,
    DEMO_RESOURCE.name,
    DEMO_RESOURCE.description,
    DEMO_RESOURCE.originalFilename,
    DEMO_RESOURCE.storedFilename,
    DEMO_RESOURCE.mimeType,
    DEMO_RESOURCE.ext,
    buffer.byteLength,
    teacherRow.id,
  );
}

/**
 * 种子主函数。
 * - 默认：仅当 users 表为空时播种（首次启动安全自动调用）。
 * - force=true：清空三表后重新播种（供 `npm run seed` 手动重置）。
 */
export function seedDatabase(options: { force?: boolean } = {}): { seeded: boolean } {
  const db = getDb();
  const { c: userCount } = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  if (userCount > 0 && !options.force) {
    return { seeded: false };
  }

  const run = db.transaction(() => {
    if (options.force) {
      // 先删子表再删父表，避免外键约束报错
      db.exec(
        'DELETE FROM submissions; DELETE FROM assignments; DELETE FROM resources; DELETE FROM modules; DELETE FROM users;',
      );
    }

    const insertUser = db.prepare(
      'INSERT INTO users (student_id, password_hash, name, role) VALUES (?, ?, ?, ?)',
    );
    for (const user of USERS) {
      insertUser.run(user.studentId, bcrypt.hashSync(user.password, 10), user.name, user.role);
    }

    const insertModule = db.prepare(
      'INSERT INTO modules (code, name, description, sort_order) VALUES (?, ?, ?, ?)',
    );
    for (const m of MODULES) {
      insertModule.run(m.code, m.name, m.description, m.sortOrder);
    }

    insertDemoResource(db);
  });

  run();
  return { seeded: true };
}

/**
 * 演示作业：若 assignments 表为空则插入一条（挂 M2 需求获取——访谈）。
 * 独立于账号种子，故已建库的旧数据库在下次启动时也会补上该演示作业。
 */
export function seedHomeworkIfEmpty(): void {
  const db = getDb();
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM assignments').get() as { c: number };
  if (c > 0) {
    return;
  }

  const teacher = db
    .prepare("SELECT id FROM users WHERE role = 'teacher' ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  if (!teacher) {
    return;
  }
  const module = db.prepare("SELECT id FROM modules WHERE code = 'M2'").get() as
    | { id: number }
    | undefined;

  db.prepare(
    `INSERT INTO assignments (title, description, module_id, due_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    '访谈提纲设计练习',
    '针对「智慧图书馆」项目，设计一份不少于 8 个问题的用户访谈提纲，并简述每个问题的目的。可使用「访谈提纲生成器」AI 工具辅助。',
    module?.id ?? null,
    '2026-06-30 23:59',
    teacher.id,
  );
}

// 作为脚本直接运行：`npm run seed` → 强制重置种子数据。
if (require.main === module) {
  const result = seedDatabase({ force: true });
  seedHomeworkIfEmpty();
  // eslint-disable-next-line no-console
  console.log(
    result.seeded
      ? '✅ 种子数据已重置：3 个账号、6 个教学模块、1 份演示资源、1 份演示作业。'
      : 'ℹ️ 数据库已有数据，未改动。',
  );
  closeDb();
}
