/**
 * 本地PDF生成脚本
 * 用法: node generate-pdf.js <data.db路径> [输出文件名]
 * 示例: node generate-pdf.js ./data.db 同学录.pdf
 */

import puppeteer from 'puppeteer';
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const TPL_DIR = join(PROJECT_ROOT, 'server', 'pdf', 'templates');
const PUBLIC_DIR = join(PROJECT_ROOT, 'client', 'public');
const UPLOADS_DIR = join(PROJECT_ROOT, 'server', 'uploads');

const TPL = (name) => readFileSync(join(TPL_DIR, name), 'utf-8');

const IMAGE_FILES = {
  'img-1': '1781607256353.png',
  'img-2': '1781607264559.png',
  'img-3': '1781607268050.png',
  'img-4': '1781607276081.png',
  'img-5': '1781607280060.png',
  'img-6': '1781607287404.png',
};

const themeCache = new Map();

function getThemeCSS(themeKey) {
  if (themeCache.has(themeKey)) return themeCache.get(themeKey);
  let css;
  if (IMAGE_FILES[themeKey]) {
    const imgPath = join(PUBLIC_DIR, IMAGE_FILES[themeKey]);
    if (existsSync(imgPath)) {
      const b64 = readFileSync(imgPath).toString('base64');
      css = `background:url(data:image/png;base64,${b64}) center/cover no-repeat;background-color:#f8fafc`;
    }
  }
  if (!css) {
    const fallback = join(PUBLIC_DIR, IMAGE_FILES['img-1']);
    const b64 = readFileSync(fallback).toString('base64');
    css = `background:url(data:image/png;base64,${b64}) center/cover no-repeat;background-color:#f8fafc`;
  }
  themeCache.set(themeKey, css);
  return css;
}

function avatarBase64(entry, uploadsDir) {
  if (!entry.avatar_path) return '<div class="avatar-placeholder">📷</div>';
  // Try local uploads dir first, then relative path
  let p = join(uploadsDir, entry.avatar_path.replace(/^uploads\//, ''));
  if (!existsSync(p)) p = join(PROJECT_ROOT, entry.avatar_path);
  if (!existsSync(p)) return '<div class="avatar-placeholder">📷</div>';
  const buf = readFileSync(p);
  const ext = entry.avatar_path.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `<img class="avatar" src="data:${mime};base64,${buf.toString('base64')}" />`;
}

function renderEntry(e, messages, uploadsDir) {
  const tpl = TPL('entry.html');
  const fields = [
    ['昵称', e.nickname], ['生日', e.birthday], ['星座', e.zodiac],
    ['性别', e.gender], ['班级', e.class_name],
    ['微信', e.wechat], ['QQ', e.qq], ['手机', e.phone], ['邮箱', e.email],
  ].filter(([,v]) => v);
  const infoRows = fields.map(([k,v]) => `<dt>${k}</dt><dd>${v||'-'}</dd>`).join('');

  const prefItems = [
    ['喜欢的颜色', e.favorite_color], ['喜欢的书籍', e.favorite_book],
    ['喜欢的电影', e.favorite_movie], ['喜欢的明星', e.favorite_star],
    ['喜欢的歌手', e.favorite_singer], ['喜欢的歌曲', e.favorite_song],
    ['爱吃的食物', e.favorite_food], ['想去的地方', e.dream_place],
  ].filter(([,v]) => v);
  const prefHtml = prefItems.length
    ? `<div class="pref-box"><div class="pref-grid">${prefItems.map(([k,v]) => `<div class="pref-item"><span class="pref-label">${k}</span><span class="pref-value">${v}</span></div>`).join('')}</div></div>`
    : '';

  let html = tpl
    .replace('{{THEME_CLASS}}', 'light')
    .replace('{{THEME_BG}}', getThemeCSS(e.bg_theme))
    .replace('{{AVATAR}}', avatarBase64(e, uploadsDir))
    .replace('{{NAME}}', e.name || '')
    .replace('{{INFO_ROWS}}', infoRows)
    .replace('{{LABEL_HTML}}', e.label ? `<span class="label">${e.label}</span>` : '')
    .replace('{{MOTTO_HTML}}', e.motto ? `<p class="motto">"${e.motto}"</p>` : '')
    .replace('{{PREF_HTML}}', prefHtml)
    .replace('{{FUTURE_HTML}}', e.future ? `<div class="future-box"><span class="future-label">人生的梦想</span><p>${e.future}</p></div>` : '')
    .replace('{{MEETING_HTML}}', e.first_meeting ? `<div class="future-box"><span class="future-label">我们第一次见面的情形</span><p>${e.first_meeting}</p></div>` : '')
    .replace('{{PERSONALITY_HTML}}', e.personality_tags?.length ? `<div class="tags">${e.personality_tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : '')
    .replace('{{BIO_HTML}}', e.bio ? `<div class="bio-box"><h3>个人介绍</h3><p>${e.bio}</p></div>` : '')
    .replace('{{TAGS_HTML}}', e.favorite_tags?.length ? `<div class="tags">${e.favorite_tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : '')
    .replace('{{QA_HTML}}', Object.keys(e.custom_answers||{}).length
      ? `<div class="qa-box">${Object.entries(e.custom_answers).map(([q,a]) => `<div class="qa-item"><p class="q">${q}</p><p class="a">${a||'-'}</p></div>`).join('')}</div>`
      : '')
    .replace('{{SIGNATURE_HTML}}', e.signature
      ? `<div class="signature-box"><p class="sig-label">✍️ 手写签名</p><img src="${e.signature}" class="sig-img" alt="签名" /></div>`
      : '')
    .replace('{{MESSAGES_HTML}}', messages?.length
      ? `<div class="messages-box"><h3 class="msg-title">💌 留言</h3>${messages.map(m => `<div class="msg-item"><p class="msg-body">${m}</p></div>`).join('')}</div>`
      : '');

  html = html.replace(/\{\{[A-Z_]+\}\}/g, '');
  return html;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('用法: node generate-pdf.js <data.db路径> [uploads目录] [输出文件名]');
    console.log('示例: node generate-pdf.js ./data.db ./uploads 同学录.pdf');
    process.exit(1);
  }

  const dbPath = resolve(args[0]);
  const uploadsDir = args[1] ? resolve(args[1]) : join(dirname(dbPath), 'uploads');
  const outputPath = resolve(args[2] || '同学录.pdf');

  if (!existsSync(dbPath)) {
    console.error(`数据库文件不存在: ${dbPath}`);
    process.exit(1);
  }

  console.log(`数据库: ${dbPath}`);
  console.log(`头像目录: ${uploadsDir}`);
  console.log(`输出: ${outputPath}`);

  // Load database
  const SQL = await initSqlJs();
  const buf = readFileSync(dbPath);
  const db = new SQL.Database(buf);

  // Query entries
  const rows = db.exec("SELECT * FROM entries WHERE is_visible = 1 ORDER BY created_at");
  const entries = (rows[0]?.values || []).map(r => ({
    id: r[0], name: r[1], gender: r[2], class_name: r[3], avatar_path: r[4],
    wechat: r[5], qq: r[6], phone: r[7], email: r[8], bio: r[9], motto: r[10],
    future: r[11], favorite_tags: JSON.parse(r[12]||'[]'), custom_answers: JSON.parse(r[13]||'{}'),
    label: r[14], bg_theme: r[15], signature: r[16], identity_code: r[17],
    is_visible: r[18], created_at: r[19],
    nickname: r[20], birthday: r[21], zodiac: r[22],
    favorite_color: r[23], favorite_book: r[24], favorite_movie: r[25],
    favorite_star: r[26], favorite_singer: r[27], favorite_song: r[28],
    favorite_food: r[29], dream_place: r[30], first_meeting: r[31],
    personality_tags: JSON.parse(r[32]||'[]'),
  }));

  console.log(`共 ${entries.length} 条记录`);

  // Query messages
  const allMsgs = db.exec("SELECT entry_id, content FROM secret_messages WHERE content != '' AND content IS NOT NULL");
  const msgMap = {};
  (allMsgs[0]?.values || []).forEach(([eid, c]) => { if (!msgMap[eid]) msgMap[eid] = []; msgMap[eid].push(c); });

  // Build HTML
  const now = new Date().toLocaleDateString('zh-CN', { year:'numeric',month:'long',day:'numeric' });
  const coverBgPath = join(TPL_DIR, 'cover-bg.png');
  const coverBg = existsSync(coverBgPath)
    ? `data:image/png;base64,${readFileSync(coverBgPath).toString('base64')}`
    : '';
  let html = TPL('cover.html')
    .replace('{{COVER_BG}}', coverBg)
    .replace('{{DATE}}', now)
    .replace('{{COUNT}}', String(entries.length));

  const tocBgPath = join(TPL_DIR, 'toc-bg.png');
  const tocBg = existsSync(tocBgPath)
    ? `data:image/png;base64,${readFileSync(tocBgPath).toString('base64')}`
    : '';
  const tocRows = entries.map((e, i) =>
    `<tr><td>${e.name}</td><td>${i + 3}</td></tr>`).join('');
  html += TPL('toc.html').replace('{{TOC_BG}}', tocBg).replace('{{ROWS}}', tocRows);

  entries.forEach(e => { html += renderEntry(e, msgMap[e.id], uploadsDir); });

  // Render PDF
  console.log('启动浏览器...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  console.log('渲染PDF中...');
  await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();

  writeFileSync(outputPath, Buffer.from(pdf));
  console.log(`✅ PDF已生成: ${outputPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
