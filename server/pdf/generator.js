import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../db/init.js';
import { fetchEntries } from '../db/entries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL = (name) => readFileSync(join(__dirname, 'templates', name), 'utf-8');

const PUBLIC_DIR = join(__dirname, '..', '..', 'client', 'public');

const IMAGE_FILES = {
  'img-1': '1781607256353.png',
  'img-2': '1781607264559.png',
  'img-3': '1781607268050.png',
  'img-4': '1781607276081.png',
  'img-5': '1781607280060.png',
  'img-6': '1781607287404.png',
};

/** HTML 转义：所有用户数据插值前必须经过（防无头浏览器里执行注入脚本） */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** 签名图仅放行 image/*;base64 的 data URL，其余丢弃 */
function safeSignatureSrc(sig) {
  if (typeof sig !== 'string') return '';
  return /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/.test(sig) ? sig : '';
}

/** 兼容字段被存成字符串的情况，渲染层绝不直接对非数组调用 .map */
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return typeof v === 'string' ? [v] : [];
}

// Cache theme CSS to avoid reading files repeatedly
const themeCache = new Map();

function getThemeCSS(themeKey) {
  if (themeCache.has(themeKey)) return themeCache.get(themeKey);
  let css;
  if (IMAGE_FILES[themeKey]) {
    const imgPath = join(PUBLIC_DIR, IMAGE_FILES[themeKey]);
    if (existsSync(imgPath)) {
      const buf = readFileSync(imgPath);
      const b64 = buf.toString('base64');
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

function avatarBase64(entry, avatarRoot) {
  if (!entry.avatar_path) return '<div class="avatar-placeholder">📷</div>';
  const root = avatarRoot || join(__dirname, '..');
  const rel = String(entry.avatar_path).replace(/\\/g, '/');
  if (rel.includes('..')) return '<div class="avatar-placeholder">📷</div>';
  // 兼容两种目录布局：root/uploads/xxx.png 或 root 就是 uploads 目录
  const candidates = [join(root, rel), join(root, rel.replace(/^uploads\//, '')), join(root, basename(rel))];
  const p = candidates.find((c) => existsSync(c));
  if (!p) return '<div class="avatar-placeholder">📷</div>';
  const buf = readFileSync(p);
  const ext = (rel.split('.').pop() || '').toLowerCase();
  const mime = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' }[ext] || 'image/jpeg';
  return `<img class="avatar" src="data:${mime};base64,${buf.toString('base64')}" />`;
}

/** 渲染单个条目页（导出以便测试/本地工具复用；pageNo 提供时渲染页脚页码） */
export function renderEntry(e, messages, avatarRoot, pageNo) {
  const tpl = TPL('entry.html');
  const fields = [
    ['昵称', e.nickname], ['生日', e.birthday], ['星座', e.zodiac],
    ['性别', e.gender], ['班级', e.class_name],
    ['微信', e.wechat], ['QQ', e.qq], ['手机', e.phone], ['邮箱', e.email],
  ].filter(([, v]) => v);
  const infoRows = fields.map(([k, v]) =>
    `<div class="info-item"><dt>${esc(k)}</dt><dd>${esc(v) || '-'}</dd></div>`).join('');

  const prefItems = [
    ['喜欢的颜色', e.favorite_color], ['喜欢的书籍', e.favorite_book],
    ['喜欢的电影', e.favorite_movie], ['喜欢的明星', e.favorite_star],
    ['喜欢的歌手', e.favorite_singer], ['喜欢的歌曲', e.favorite_song],
    ['爱吃的食物', e.favorite_food], ['想去的地方', e.dream_place],
  ].filter(([, v]) => v);
  const prefHtml = prefItems.length
    ? `<div class="pref-box"><div class="pref-grid">${prefItems.map(([k, v]) => `<div class="pref-item"><span class="pref-label">${esc(k)}</span><span class="pref-value">${esc(v)}</span></div>`).join('')}</div></div>`
    : '';

  const personalityTags = asArray(e.personality_tags);
  const favoriteTags = asArray(e.favorite_tags);
  const customAnswers = e.custom_answers && typeof e.custom_answers === 'object' && !Array.isArray(e.custom_answers)
    ? e.custom_answers : {};
  const sigSrc = safeSignatureSrc(e.signature);

  // 注意：替换值使用函数形式，避免用户数据中的 $ 序列被 String.replace 解释
  let html = tpl
    .replace('{{THEME_CLASS}}', () => 'light')
    .replace('{{THEME_BG}}', () => getThemeCSS(e.bg_theme))
    .replace('{{AVATAR}}', () => avatarBase64(e, avatarRoot))
    .replace('{{NAME}}', () => esc(e.name || ''))
    .replace('{{INFO_ROWS}}', () => infoRows)
    .replace('{{LABEL_HTML}}', () => (e.label ? `<span class="label">${esc(e.label)}</span>` : ''))
    .replace('{{MOTTO_HTML}}', () => (e.motto ? `<p class="motto">「${esc(e.motto)}」</p>` : ''))
    .replace('{{PREF_HTML}}', () => prefHtml)
    .replace('{{FUTURE_HTML}}', () => (e.future ? `<div class="future-box"><span class="future-label">人生的梦想</span><p>${esc(e.future)}</p></div>` : ''))
    .replace('{{MEETING_HTML}}', () => (e.first_meeting ? `<div class="future-box"><span class="future-label">我们第一次见面的情形</span><p>${esc(e.first_meeting)}</p></div>` : ''))
    .replace('{{PERSONALITY_HTML}}', () => (personalityTags.length ? `<div class="tags">${personalityTags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''))
    .replace('{{BIO_HTML}}', () => (e.bio ? `<div class="bio-box"><h3>个人介绍</h3><p>${esc(e.bio)}</p></div>` : ''))
    .replace('{{TAGS_HTML}}', () => (favoriteTags.length ? `<div class="tags">${favoriteTags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''))
    .replace('{{QA_HTML}}', () => (Object.keys(customAnswers).length
      ? `<div class="qa-box">${Object.entries(customAnswers).map(([q, a]) => `<div class="qa-item"><p class="q">${esc(q)}</p><p class="a">${esc(a) || '-'}</p></div>`).join('')}</div>`
      : ''))
    .replace('{{SIGNATURE_HTML}}', () => (sigSrc
      ? `<div class="signature-box"><p class="sig-label">✍️ 手写签名</p><img src="${sigSrc}" class="sig-img" alt="签名" /></div>`
      : ''))
    .replace('{{MESSAGES_HTML}}', () => (Array.isArray(messages) && messages.length
      ? `<div class="messages-box"><h3 class="msg-title">💌 留言</h3>${messages.map((m) => `<div class="msg-item"><p class="msg-body">${esc(m)}</p></div>`).join('')}</div>`
      : ''))
    .replace('{{FOOTER_HTML}}', () => (pageNo
      ? `<div class="footer">— ${esc(pageNo)} —</div>`
      : ''));

  html = html.replace(/\{\{[A-Z_]+\}\}/g, '');
  return html;
}

// Singleton browser instance — reuse across PDF generations
let browserInstance = null;
let browserLastUsed = 0;
const BROWSER_MAX_IDLE = 5 * 60 * 1000; // close after 5 min idle

/**
 * 依次尝试多种启动方式：
 * 1) PUPPETEER_EXECUTABLE_PATH 指定的浏览器（服务器部署常用）
 * 2) puppeteer 自带下载的浏览器
 * 3) 本机安装的 Chrome / Edge（本地生成 PDF 时零配置可用）
 */
async function launchBrowser() {
  const base = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  };
  const candidates = [];
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    candidates.push({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  }
  candidates.push({}, { channel: 'chrome' }, { channel: 'msedge' });

  let lastErr;
  for (const extra of candidates) {
    try {
      return await puppeteer.launch({ ...base, ...extra });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function getBrowser() {
  // Close stale browser
  if (browserInstance) {
    const idle = Date.now() - browserLastUsed;
    if (idle > BROWSER_MAX_IDLE) {
      try { await browserInstance.close(); } catch { /* ignore */ }
      browserInstance = null;
    }
  }
  if (!browserInstance) {
    browserInstance = await launchBrowser();
  }
  browserLastUsed = Date.now();
  return browserInstance;
}

// 目录页每页容纳的行数（行高约48px，页面可用高度约900px，取保守值）
const TOC_ROWS_PER_PAGE = 16;

/**
 * 由条目数据构建完整 PDF 的 HTML（封面 + 目录分页 + 每人一页）。
 * 不依赖数据库与浏览器，可被本地脚本复用。
 * @param {Array} entries 已映射的条目数组（JSON 字段已解析）
 * @param {Object} msgMap  entry_id -> 留言字符串数组
 * @param {{ avatarRoot?: string }} [opts] 头像查找根目录（默认 server 目录）
 */
export function buildPdfHtml(entries, msgMap = {}, opts = {}) {
  const avatarRoot = opts.avatarRoot;

  // Cover（布面精装封面）
  const now = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  let html = TPL('cover.html')
    .replace('{{DATE}}', () => now)
    .replace('{{COUNT}}', () => String(entries.length));

  // TOC（目录按 16 行/页分页，条目页码从目录之后开始）
  const tocPageCount = Math.max(1, Math.ceil(entries.length / TOC_ROWS_PER_PAGE));
  const entryStartPage = tocPageCount + 2; // 封面=1，目录=2..(1+tocPageCount)
  for (let p = 0; p < tocPageCount; p++) {
    const chunk = entries.slice(p * TOC_ROWS_PER_PAGE, (p + 1) * TOC_ROWS_PER_PAGE);
    const tocRows = chunk.map((e, i) =>
      `<tr><td class="toc-name">${esc(e.name)}</td><td class="toc-dots"></td><td class="toc-page">${entryStartPage + p * TOC_ROWS_PER_PAGE + i}</td></tr>`).join('');
    html += TPL('toc.html')
      .replace('{{ROWS}}', () => tocRows)
      .replace('{{PAGE_NO}}', () => String(p + 2));
  }

  // Entry pages（每人一页，页脚带页码）
  entries.forEach((e, i) => {
    html += renderEntry(e, msgMap[e.id], avatarRoot, entryStartPage + i);
  });
  return html;
}

/** 把 HTML 渲染为 PDF 字节（复用单例浏览器） */
export async function htmlToPdf(html) {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return pdf;
  } finally {
    if (page) { try { await page.close(); } catch { /* ignore */ } }
    browserLastUsed = Date.now();
  }
}

/** 关闭单例浏览器（CLI 场景用完退出，避免进程被浏览器挂住） */
export async function closeBrowser() {
  if (browserInstance) {
    try { await browserInstance.close(); } catch { /* ignore */ }
    browserInstance = null;
  }
}

/** 服务端入口：从数据库读取数据并生成 PDF */
export async function generatePdf() {
  const db = await getDb();
  // 与“可见性开关”一致：仅导出可见条目；0 条时也能正常生成
  const entries = fetchEntries(db, { where: 'WHERE is_visible = 1', orderBy: 'created_at' });

  const allMsgs = db.exec("SELECT entry_id, content FROM secret_messages WHERE content != '' AND content IS NOT NULL");
  const msgMap = {};
  (allMsgs[0]?.values || []).forEach(([eid, c]) => { if (!msgMap[eid]) msgMap[eid] = []; msgMap[eid].push(c); });

  const html = buildPdfHtml(entries, msgMap);
  return htmlToPdf(html);
}
