import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../db/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL = (name) => readFileSync(join(__dirname, 'templates', name), 'utf-8');

const THEME_CSS = {
  'solid-indigo':  'background:#6366f1',
  'solid-rose':    'background:#f43f5e',
  'solid-emerald': 'background:#10b981',
  'solid-amber':   'background:#f59e0b',
  'grade-sunset':  'background:linear-gradient(135deg,#f97316,#ec4899)',
  'grade-ocean':   'background:linear-gradient(135deg,#06b6d4,#3b82f6)',
  'grade-forest':  'background:linear-gradient(135deg,#22c55e,#059669)',
  'grade-twilight':'background:linear-gradient(135deg,#8b5cf6,#1e1b4b)',
  'pattern-dots':  'background:radial-gradient(circle,#cbd5e1 1px,transparent 1px);background-size:20px 20px;background-color:#f8fafc',
  'pattern-grid':  'background:linear-gradient(#e2e8f0 1px,transparent 1px),linear-gradient(90deg,#e2e8f0 1px,transparent 1px);background-size:24px 24px;background-color:#f8fafc',
  'pattern-cross': 'background:repeating-linear-gradient(45deg,#e2e8f0 0,#e2e8f0 1px,transparent 0,transparent 10px);background-color:#f8fafc',
  'pattern-waves': 'background:linear-gradient(0deg,#bfdbfe 0%,#eff6ff 50%,#bfdbfe 100%);background-color:#eff6ff',
};

function avatarBase64(entry) {
  if (!entry.avatar_path) return '<div class="avatar-placeholder">📷</div>';
  const p = join(__dirname, '..', entry.avatar_path);
  if (!existsSync(p)) return '<div class="avatar-placeholder">📷</div>';
  const buf = readFileSync(p);
  const ext = entry.avatar_path.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `<img class="avatar" src="data:${mime};base64,${buf.toString('base64')}" />`;
}

function renderEntry(e) {
  const tpl = TPL('entry.html');
  const fields = [
    ['性别', e.gender], ['班级', e.class_name], ['微信', e.wechat], ['QQ', e.qq],
    ['手机', e.phone], ['邮箱', e.email], ['未来', e.future],
  ].filter(([,v]) => v);
  const infoRows = fields.map(([k,v]) => `<dt>${k}</dt><dd>${v||'-'}</dd>`).join('');
  const isLight = (e.bg_theme || '').startsWith('pattern');

  let html = tpl
    .replace('{{THEME_CLASS}}', isLight ? 'light' : '')
    .replace('{{THEME_BG}}', THEME_CSS[e.bg_theme] || THEME_CSS['solid-indigo'])
    .replace('{{AVATAR}}', avatarBase64(e))
    .replace('{{NAME}}', e.name || '')
    .replace('{{INFO_ROWS}}', infoRows)
    .replace('{{LABEL_HTML}}', e.label ? `<span class="label">${e.label}</span>` : '')
    .replace('{{MOTTO_HTML}}', e.motto ? `<p class="motto">"${e.motto}"</p>` : '')
    .replace('{{BIO_HTML}}', e.bio ? `<div class="bio-box"><h3>个人介绍</h3><p>${e.bio}</p></div>` : '')
    .replace('{{TAGS_HTML}}', e.favorite_tags?.length ? `<div class="tags">${e.favorite_tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : '')
    .replace('{{QA_HTML}}', Object.keys(e.custom_answers||{}).length
      ? `<div class="qa-box">${Object.entries(e.custom_answers).map(([q,a]) => `<div class="qa-item"><p class="q">${q}</p><p class="a">${a||'-'}</p></div>`).join('')}</div>`
      : '');

  html = html.replace(/\{\{[A-Z_]+\}\}/g, '');
  return html;
}

export async function generatePdf() {
  const db = await getDb();
  const rows = db.exec("SELECT * FROM entries WHERE is_visible = 1 ORDER BY created_at");
  const entries = (rows[0]?.values || []).map(r => ({
    id: r[0], name: r[1], gender: r[2], class_name: r[3], avatar_path: r[4],
    wechat: r[5], qq: r[6], phone: r[7], email: r[8], bio: r[9], motto: r[10],
    future: r[11], favorite_tags: JSON.parse(r[12]||'[]'), custom_answers: JSON.parse(r[13]||'{}'),
    label: r[14], bg_theme: r[15], is_visible: r[16], created_at: r[17],
  }));

  // Cover
  const now = new Date().toLocaleDateString('zh-CN', { year:'numeric',month:'long',day:'numeric' });
  let html = TPL('cover.html')
    .replace('{{TITLE}}', '🎓 同学录')
    .replace('{{DATE}}', now)
    .replace('{{COUNT}}', String(entries.length));

  // TOC
  const tocRows = entries.map((e, i) =>
    `<tr><td>${e.name}</td><td>${i + 3}</td></tr>`).join('');
  html += TPL('toc.html').replace('{{ROWS}}', tocRows);

  // Entry pages
  entries.forEach(e => { html += renderEntry(e); });

  // Secrets
  let secretsHtml = '';
  const allMsgs = db.exec("SELECT entry_id, content FROM secret_messages WHERE content != '' AND content IS NOT NULL");
  const msgMap = {};
  (allMsgs[0]?.values || []).forEach(([eid, c]) => { if (!msgMap[eid]) msgMap[eid] = []; msgMap[eid].push(c); });
  for (const e of entries) {
    (msgMap[e.id] || []).forEach((content) => {
      secretsHtml += `<div class="msg-block"><p class="from">来自：${e.name}</p><p class="body">${content}</p></div>`;
    });
  }
  if (!secretsHtml) secretsHtml = '<p class="empty">暂无私密留言</p>';
  html += TPL('secrets.html').replace('{{ROWS}}', secretsHtml);

  // Render PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  return pdf;
}
