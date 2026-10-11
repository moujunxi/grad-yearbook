/* 迁移测试——项目根目录运行：node tests/_migration_test.mjs
 * 会临时替换 server/data.db（先备份、测完恢复），需先停止服务端进程。
 */
/* 验证 init.js 迁移：老式列序的库 → 迁移后与 schema.sql 一致，且数据保留 */
import initSqlJs from '../server/node_modules/sql.js/dist/sql-wasm.js';
import { copyFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dbPath = 'server/data.db';
const bak = 'server/data.db.bak';

let fail = 0;
const check = (cond, name, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name} ${extra}`);
  if (!cond) fail++;
};

// schema.sql 目标列序
const EXPECTED = [
  'id', 'name', 'gender', 'class_name', 'avatar_path', 'wechat', 'qq', 'phone', 'email',
  'bio', 'motto', 'future', 'favorite_tags', 'custom_answers', 'label', 'bg_theme',
  'signature', 'identity_code', 'nickname', 'birthday', 'zodiac',
  'favorite_color', 'favorite_book', 'favorite_movie', 'favorite_star', 'favorite_singer',
  'favorite_song', 'favorite_food', 'dream_place', 'first_meeting', 'personality_tags',
  'is_visible', 'created_at',
].join(',');

// 1. 构造“老库”（is_visible/created_at 在 bg_theme 后，signature 等新列被追加在尾部）
const SQL = await initSqlJs();
const db = new SQL.Database();
const legacyCols = [
  'id INTEGER PRIMARY KEY AUTOINCREMENT', 'name TEXT NOT NULL', 'gender TEXT', 'class_name TEXT',
  'avatar_path TEXT', 'wechat TEXT', 'qq TEXT', 'phone TEXT', 'email TEXT', 'bio TEXT', 'motto TEXT',
  'future TEXT', 'favorite_tags TEXT', 'custom_answers TEXT', 'label TEXT', 'bg_theme TEXT',
  'is_visible INTEGER DEFAULT 1', 'created_at TEXT',
  'signature TEXT', 'identity_code TEXT', 'nickname TEXT', 'birthday TEXT', 'zodiac TEXT',
  'favorite_color TEXT', 'favorite_book TEXT', 'favorite_movie TEXT', 'favorite_star TEXT',
  'favorite_singer TEXT', 'favorite_song TEXT', 'favorite_food TEXT', 'dream_place TEXT',
  'first_meeting TEXT', 'personality_tags TEXT',
];
db.run(`CREATE TABLE entries (${legacyCols.join(',')})`);
db.run('CREATE TABLE secret_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id INTEGER, content TEXT)');
db.run('CREATE TABLE admin (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL)');
db.run('CREATE TABLE site_config (key TEXT PRIMARY KEY, value TEXT)');
db.run('CREATE TABLE identity_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, blessing_message TEXT NOT NULL, created_at TEXT)');
db.run(`INSERT INTO entries (name, bg_theme, favorite_tags, signature, nickname, is_visible, created_at)
        VALUES ('老库用户', 'img-3', '["篮球"]', 'data:image/png;base64,AAAA', '小老', 0, '2024-01-01 00:00:00')`);
db.run(`INSERT INTO secret_messages (entry_id, content) VALUES (1, '老留言')`);

// 备份现有库并写入老库
if (existsSync(dbPath)) copyFileSync(dbPath, bak);
writeFileSync(dbPath, Buffer.from(db.export()));
console.log('已构造老库（列序与 schema 不一致）');

// 2. 子进程执行 getDb() 触发迁移
let out = '';
try {
  out = execFileSync(process.execPath, ['-e', `
    import('./server/db/init.js').then(async (m) => {
      const db = await m.getDb();
      const cols = db.exec('PRAGMA table_info(entries)')[0].values.map(v => v[1]);
      console.log('COLS=' + cols.join(','));
      const { fetchEntryById } = await import('./server/db/entries.js');
      const e = fetchEntryById(db, 1);
      console.log('ROW=' + JSON.stringify({ name: e.name, theme: e.bg_theme, tags: e.favorite_tags, sig: e.signature, nick: e.nickname, vis: e.is_visible, created: e.created_at }));
      const msgs = db.exec("SELECT content FROM secret_messages WHERE entry_id = 1");
      console.log('MSG=' + (msgs[0]?.values?.[0]?.[0] ?? ''));
      process.exit(0);
    }).catch((e) => { console.error('ERR', e); process.exit(1); });
  `], { encoding: 'utf8', cwd: process.cwd() });
} catch (e) {
  console.log('子进程失败:', e.stdout || '', e.stderr || '');
}

const colsLine = (out.match(/^COLS=(.*)$/m) || [])[1] || '';
const rowLine = (out.match(/^ROW=(.*)$/m) || [])[1] || '';
const msgLine = (out.match(/^MSG=(.*)$/m) || [])[1] || '';

check(colsLine === EXPECTED, '迁移后列序与 schema.sql 一致', colsLine ? '' : '(未取到列序)');
if (colsLine !== EXPECTED && colsLine) {
  console.log('  实际:', colsLine);
  console.log('  期望:', EXPECTED);
}
const row = rowLine ? JSON.parse(rowLine) : {};
check(row.name === '老库用户' && row.theme === 'img-3' && Array.isArray(row.tags)
  && row.tags[0] === '篮球' && row.sig === 'data:image/png;base64,AAAA'
  && row.nick === '小老' && Number(row.vis) === 0, '迁移后数据按列名正确读取', JSON.stringify(row));
check(msgLine === '老留言', '关联留言保留');

// 3. 恢复原库（原本无库则删除测试产物）
if (existsSync(bak)) { renameSync(bak, dbPath); console.log('已恢复原 data.db'); }
else if (existsSync(dbPath)) { unlinkSync(dbPath); console.log('已删除测试产生的 data.db（原本不存在）'); }

console.log(fail ? `\n${fail} 项失败` : '\n迁移测试全部通过');
process.exit(fail ? 1 : 0);
