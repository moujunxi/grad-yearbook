/**
 * 本地生成同学录 PDF —— 直接读本机数据，不请求服务器（垃圾服务器不用出力）。
 *
 * 用法:
 *   node scripts/generate-pdf.js <data.db 或 entries.json> [uploads目录] [输出文件名] [--all]
 *
 * 示例:
 *   node scripts/generate-pdf.js D:\下载\data.db D:\下载\uploads 同学录.pdf
 *   node scripts/generate-pdf.js D:\下载\entries.json
 *   node scripts/generate-pdf.js entries.json ./uploads 同学录.pdf --all
 *
 * 数据来源（二选一，按扩展名自动识别）:
 *   - entries.json：后台「导出 JSON（含私密留言）」下载的文件
 *   - data.db：服务器上的数据库文件（连同 uploads/ 一起下载）
 *
 * 说明:
 *   - 默认只导出“可见”条目，加 --all 包含已隐藏条目
 *   - 浏览器自动选择：PUPPETEER_EXECUTABLE_PATH > 自带 > 本机 Chrome > Edge
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdfHtml, htmlToPdf, closeBrowser } from '../server/pdf/generator.js';
import { entriesFromExec, mapEntryRow } from '../server/db/entries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// sql.js 依赖装在 server/ 下，从那里解析
const serverRequire = createRequire(join(PROJECT_ROOT, 'server', 'package.json'));

const USAGE = `本地生成同学录 PDF（离线运行，不访问服务器）

用法:
  node scripts/generate-pdf.js <data.db 或 entries.json> [uploads目录] [输出文件名] [--all]

参数:
  <data.db 或 entries.json>  数据来源（按扩展名识别）
  [uploads目录]             头像目录，默认为数据文件旁边的 uploads/
  [输出文件名]               默认: 同学录.pdf
  --all                     包含已隐藏的条目（默认只导出“可见”条目）
  --help                    显示本帮助

示例:
  node scripts/generate-pdf.js D:\\下载\\data.db D:\\下载\\uploads 同学录.pdf
  node scripts/generate-pdf.js D:\\下载\\entries.json
`;

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function loadFromDb(dbPath, includeAll) {
  const initSqlJs = serverRequire('sql.js');
  const SQL = await initSqlJs();
  let db;
  try {
    db = new SQL.Database(readFileSync(dbPath));
  } catch (e) {
    fail(`无法读取数据库 ${dbPath}: ${e.message}`);
  }
  try {
    const where = includeAll ? '' : 'WHERE is_visible = 1';
    const entries = entriesFromExec(db.exec(`SELECT * FROM entries ${where} ORDER BY created_at`));
    const msgRows = db.exec(
      "SELECT entry_id, content FROM secret_messages WHERE content != '' AND content IS NOT NULL",
    );
    const msgMap = {};
    (msgRows[0]?.values || []).forEach(([eid, c]) => {
      if (!msgMap[eid]) msgMap[eid] = [];
      msgMap[eid].push(c);
    });
    return { entries, msgMap };
  } finally {
    db.close();
  }
}

function loadFromJson(jsonPath, includeAll) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    fail(`无法解析 JSON ${jsonPath}: ${e.message}`);
  }
  if (!Array.isArray(raw)) fail(`${jsonPath} 不是条目数组（应为后台导出的 JSON）`);

  // mapEntryRow 统一归一化：老导出里标签字段可能是字符串也能兼容
  let entries = raw.map((row) => {
    const e = mapEntryRow(row);
    return e;
  });
  if (!includeAll) entries = entries.filter((e) => Number(e.is_visible));

  const msgMap = {};
  for (const e of entries) {
    const msgs = Array.isArray(e.secret_messages)
      ? e.secret_messages.filter((m) => typeof m === 'string' && m.trim())
      : [];
    if (msgs.length) msgMap[e.id] = msgs;
  }
  return { entries, msgMap };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    process.exit(args.length === 0 ? 1 : 0);
  }
  const includeAll = args.includes('--all');
  const positional = args.filter((a) => !a.startsWith('--'));
  const [dataArg, uploadsArg, outArg] = positional;
  if (!dataArg) fail('缺少数据文件参数，--help 查看用法');

  const dataPath = resolve(dataArg);
  if (!existsSync(dataPath)) fail(`数据文件不存在: ${dataPath}`);
  if (statSync(dataPath).isDirectory()) fail(`${dataPath} 是目录，请指向 data.db 或 entries.json 文件`);

  const isJson = dataPath.toLowerCase().endsWith('.json');
  const uploadsDir = uploadsArg
    ? resolve(uploadsArg)
    : join(dirname(dataPath), 'uploads');
  const outputPath = resolve(outArg || '同学录.pdf');

  console.log(`数据: ${dataPath}${isJson ? '（JSON 导出）' : '（数据库）'}`);
  console.log(`头像目录: ${uploadsDir}${existsSync(uploadsDir) ? '' : '（不存在，头像将显示占位图）'}`);
  console.log(`输出: ${outputPath}`);

  const t0 = Date.now();
  const { entries, msgMap } = isJson
    ? loadFromJson(dataPath, includeAll)
    : await loadFromDb(dataPath, includeAll);
  const msgCount = Object.values(msgMap).reduce((n, a) => n + a.length, 0);
  console.log(`共 ${entries.length} 条条目（${includeAll ? '含隐藏' : '仅可见'}），${msgCount} 条留言`);

  if (entries.length === 0) fail('没有可导出的条目（都隐藏了？或用 --all 包含隐藏条目）');

  console.log('构建 HTML...');
  const html = buildPdfHtml(entries, msgMap, { avatarRoot: uploadsDir });

  console.log('启动浏览器（本机 Chrome/Edge）...');
  try {
    const pdf = await htmlToPdf(html);
    writeFileSync(outputPath, Buffer.from(pdf));
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`✅ 完成（${sec}s）: ${outputPath}（${(pdf.length / 1024 / 1024).toFixed(1)} MB）`);
  } finally {
    // 关掉单例浏览器，否则进程不会退出
    await closeBrowser();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
