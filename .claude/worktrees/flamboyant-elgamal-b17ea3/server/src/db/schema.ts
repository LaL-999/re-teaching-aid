/**
 * 数据库结构定义（DDL）。
 * 三张表：users（账号/角色）、modules（教学模块）、resources（课件资源）。
 * 全部使用 IF NOT EXISTS，可重复执行（幂等）。
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS modules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resources (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id         INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL DEFAULT '',
  original_filename TEXT    NOT NULL,
  stored_filename   TEXT    NOT NULL,
  mime_type         TEXT    NOT NULL,
  ext               TEXT    NOT NULL,
  size              INTEGER NOT NULL,
  uploaded_by       INTEGER NOT NULL REFERENCES users(id),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module_id);
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at);

CREATE TABLE IF NOT EXISTS assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  module_id   INTEGER REFERENCES modules(id) ON DELETE SET NULL,
  due_date    TEXT,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT    NOT NULL DEFAULT '',
  score         INTEGER,
  feedback      TEXT,
  submitted_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  graded_at     TEXT,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
`;
