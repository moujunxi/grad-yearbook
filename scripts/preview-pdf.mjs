/* 视觉预览：构建示例条目 → 渲染 HTML → 逐页截图 + 出 PDF，供目检迭代 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdfHtml, htmlToPdf, closeBrowser } from '../server/pdf/generator.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'server', 'package.json'));
const puppeteer = require('puppeteer');

const OUT = join(ROOT, 'tests', '_preview');
mkdirSync(OUT, { recursive: true });

const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// —— 1. 先画一张像样的示例头像（水彩渐变 + 姓氏字符） ——
async function makeAvatar() {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 400 });
  await page.setContent(`<html><body style="margin:0">
    <div style="width:400px;height:400px;background:
      radial-gradient(circle at 35% 30%, #f6e7d8 0%, #e8c9a8 45%, #c9997a 100%);
      display:flex;align-items:center;justify-content:center;
      font-family:'KaiTi','SimSun',serif;font-size:170px;color:rgba(90,60,40,.85)">林</div>
  </body></html>`);
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(join(OUT, 'avatar.png'), buf);
  await browser.close();
  return join(OUT, 'avatar.png');
}

async function launch() {
  for (const extra of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
    try {
      return await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
        ...extra,
      });
    } catch { /* try next */ }
  }
  throw new Error('无法启动浏览器');
}

// —— 2. 示例条目 ——
const sig = `data:image/png;base64,${tinyPng}`;

const entries = [
  {
    id: 1, name: '林晓芸', nickname: '小芸', gender: '女', class_name: '高三(1)班',
    avatar_path: 'uploads/avatar.png',
    birthday: '2006-05-20', zodiac: '金牛座',
    wechat: 'xiaoyun_0605', qq: '2046188666', phone: '138****6688', email: 'xiaoyun@example.com',
    motto: '愿你走出半生，归来仍是少年',
    bio: '三年时光倏忽而过，谢谢你们让平凡的日子闪闪发光。愿此去前程似锦，再相逢依旧如故。',
    future: '考上理想的大学，读喜欢的专业，成为能温暖别人的人。',
    first_meeting: '开学那天你抱着一摞书撞到了我，书洒了一地，我们蹲在走廊上一边捡一边笑。',
    favorite_color: '雾霾蓝', favorite_book: '小王子', favorite_movie: '千与千寻',
    favorite_star: '周深', favorite_singer: '周深', favorite_song: '大鱼',
    favorite_food: '芒果班戟', dream_place: '冰岛',
    personality_tags: ['温柔细腻', '校园歌神'],
    favorite_tags: ['绘画', '音乐', '阅读', '羽毛球'],
    custom_answers: { '最想回到哪一天？': '高一军训的那个傍晚', '给十年后的自己一句话': '别弄丢眼里的光' },
    label: '温柔担当', bg_theme: 'img-2', signature: sig,
    is_visible: 1, created_at: '2026-03-15 10:00:00',
    secret_messages: ['毕业快乐！记得常联系呀～', '下次见面要告诉我冰岛好不好玩！'],
  },
  {
    id: 2, name: '陈子豪', nickname: '豪哥', gender: '男', class_name: '高三(1)班',
    avatar_path: null, birthday: '2005-11-02', zodiac: '天蝎座',
    wechat: '', qq: '188666888', phone: '', email: '',
    motto: '乾坤未定，你我皆是黑马。',
    bio: '篮球队 13 号，迟到大王，但值日从不偷懒。',
    future: '打一辈子篮球。',
    first_meeting: '', favorite_color: '黑金', favorite_book: '', favorite_movie: '灌篮高手',
    favorite_star: '', favorite_singer: '', favorite_song: '', favorite_food: '烤肉', dream_place: '奈良',
    personality_tags: ['搞笑担当', '果敢强势'],
    favorite_tags: ['篮球', '游戏'],
    custom_answers: { '最想回到哪一天？': '' },
    label: '搞笑担当', bg_theme: 'img-5', signature: '',
    is_visible: 1, created_at: '2026-03-15 10:05:00',
    secret_messages: ['作业借我抄一下（不是）'],
  },
  {
    id: 3, name: '苏一然', nickname: '', gender: '女', class_name: '高三(1)班',
    avatar_path: null, birthday: '', zodiac: '',
    wechat: '', qq: '', phone: '', email: '',
    motto: '', bio: '', future: '', first_meeting: '',
    favorite_color: '', favorite_book: '', favorite_movie: '', favorite_star: '',
    favorite_singer: '', favorite_song: '', favorite_food: '', dream_place: '',
    personality_tags: [], favorite_tags: [], custom_answers: {},
    label: '学霸', bg_theme: 'img-4', signature: '',
    is_visible: 1, created_at: '2026-03-15 10:10:00',
    secret_messages: [],
  },
];

// —— 3. 构建 + 截图 + PDF ——
await makeAvatar();
const msgMap = {};
entries.forEach((e) => { if (e.secret_messages?.length) msgMap[e.id] = e.secret_messages; });
const html = buildPdfHtml(entries, msgMap, { avatarRoot: OUT });
writeFileSync(join(OUT, 'preview.html'), html);

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1.5 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const pages = await page.$$('.page');
console.log(`共 ${pages.length} 页，截图中...`);
for (let i = 0; i < pages.length; i++) {
  await pages[i].screenshot({ path: join(OUT, `page-${i + 1}.png`) });
}
await browser.close();

const pdf = await htmlToPdf(html);
writeFileSync(join(OUT, 'preview.pdf'), Buffer.from(pdf));
await closeBrowser();
console.log('✅ preview.html / page-*.png / preview.pdf 已生成');
