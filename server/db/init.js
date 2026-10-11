import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data.db');

let db;
let SQL;

/** 将内存数据库持久化到磁盘（先写临时文件再原子替换，避免写坏库文件） */
function saveToDisk() {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = `${DB_PATH}.tmp`;
  writeFileSync(tmpPath, Buffer.from(db.export()));
  renameSync(tmpPath, DB_PATH);
}

/**
 * 解析 schema.sql 中 entries 表的建表语句与列定义。
 * 返回 { createSql, columns: [{ name, def }] }，列序即为目标列序。
 */
function parseEntriesDDL(schemaSql) {
  const m = schemaSql.match(/CREATE TABLE IF NOT EXISTS entries\s*\(([\s\S]*?)\);/i);
  if (!m) return null;
  const body = m[1];
  // 顶层逗号切分（跳过括号内的逗号，如 datetime('now','localtime')）
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  const columns = parts
    .map((def) => ({ name: def.split(/\s+/)[0], def }))
    .filter((c) => c.name && !/^(PRIMARY|UNIQUE|CHECK|FOREIGN|CONSTRAINT)/i.test(c.name));
  return { createSql: `CREATE TABLE IF NOT EXISTS entries (${body})`, columns };
}

/**
 * 兼容迁移：
 * 1) 为已有 entries 表补齐 schema 中缺失的列（含 is_visible/created_at）；
 * 2) 若列序与 schema 不一致（老式 ALTER 追加会导致错位），重建表按 schema 列序重排。
 */
function migrateEntriesTable(db, schemaSql) {
  let info;
  try {
    info = db.exec('PRAGMA table_info(entries)');
  } catch { return; }
  if (!info.length) return;

  const parsed = parseEntriesDDL(schemaSql);
  if (!parsed) return;

  let actual = info[0].values.map((v) => v[1]);

  // 1) 补齐缺失列
  const missing = parsed.columns.filter((c) => !actual.includes(c.name));
  for (const col of missing) {
    try {
      db.run(`ALTER TABLE entries ADD COLUMN ${col.def}`);
      actual.push(col.name);
    } catch (e) {
      console.error(`[migration] 添加列 ${col.name} 失败:`, e.message);
    }
  }

  // 2) 列序不一致则重建表
  const expected = parsed.columns.map((c) => c.name);
  if (actual.join(',') === expected.join(',')) return;

  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');
    db.exec(parsed.createSql.replace('IF NOT EXISTS entries', 'IF NOT EXISTS entries_migrated'));
    // 两侧都按“目标列名”列出：补齐缺失列后所有列均存在，仅列序不同
    db.run(
      `INSERT INTO entries_migrated (${expected.join(',')}) SELECT ${expected.join(',')} FROM entries`,
    );
    db.run('DROP TABLE entries');
    db.run('ALTER TABLE entries_migrated RENAME TO entries');
    db.run('COMMIT');
    console.log('[migration] entries 表列序已与 schema.sql 对齐');
  } catch (e) {
    console.error('[migration] 重建 entries 表失败（读写已改为按列名映射，不影响功能）:', e.message);
    try { db.run('ROLLBACK'); } catch { /* ignore */ }
    try { db.run('DROP TABLE IF EXISTS entries_migrated'); } catch { /* ignore */ }
  } finally {
    try { db.exec('PRAGMA foreign_keys = ON'); } catch { /* ignore */ }
  }
}

/** 获取数据库实例（异步初始化） */
export async function getDb() {
  if (!db) {
    SQL = await initSqlJs();

    // 尝试加载已有数据库文件，否则创建空库
    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    // 执行建表 schema（sql.js 的 run 只执行一条语句，exec 可批量）
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);

    // 兼容迁移：补齐缺失列并统一列序
    migrateEntriesTable(db, schema);

    // 首次启动 seed 默认管理员
    const count = db.exec('SELECT COUNT(*) FROM admin')[0].values[0][0];
    if (count === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.run('INSERT INTO admin (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    }

    saveToDisk();
  }
  return db;
}

/** 执行写操作后手动落盘 */
export function persist() {
  saveToDisk();
}
