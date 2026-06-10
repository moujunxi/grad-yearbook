import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data.db');

let db;
let SQL;

/** 将内存数据库持久化到磁盘 */
function saveToDisk() {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DB_PATH, Buffer.from(db.export()));
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
