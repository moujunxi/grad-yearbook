/* 生成演示数据 → 调用本地工具产出「测试同学录.pdf」 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = join(ROOT, 'tests', '_demo');
const require = createRequire(join(ROOT, 'server', 'package.json'));
const puppeteer = require('puppeteer');

async function launch() {
  for (const extra of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
    try {
      return await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
        ...extra,
      });
    } catch { /* next */ }
  }
  throw new Error('无法启动浏览器');
}

// 画示例头像（姓氏 + 渐变底）与手写签名（笔迹路径）
async function makeAssets() {
  rmSync(DEMO, { recursive: true, force: true });
  mkdirSync(join(DEMO, 'uploads'), { recursive: true });
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 400 });

  const avatars = [
    ['avatar-ly.png', '林', 'radial-gradient(circle at 35% 30%, #f6e7d8, #e0b892 50%, #c08a6a)'],
    ['avatar-zm.png', '周', 'radial-gradient(circle at 35% 30%, #dfe9f3, #a8c0d8 50%, #7d9bb8)'],
    ['avatar-zy.png', '赵', 'radial-gradient(circle at 35% 30%, #f3e3ef, #d4a8c8 50%, #b57ba3)'],
  ];
  for (const [file, ch, bg] of avatars) {
    await page.setContent(`<html><body style="margin:0">
      <div style="width:400px;height:400px;background:${bg};
        display:flex;align-items:center;justify-content:center;
        font-family:'KaiTi','SimSun',serif;font-size:170px;color:rgba(70,50,40,.85)">${ch}</div>
    </body></html>`);
    writeFileSync(join(DEMO, 'uploads', file), await page.screenshot({ type: 'png' }));
  }

  // 手写签名片段（透明底）
  await page.setViewport({ width: 600, height: 160 });
  await page.setContent(`<html><body style="margin:0;background:transparent">
    <svg width="600" height="160" viewBox="0 0 600 160" style="background:transparent">
      <path d="M30,110 C60,30 90,130 120,70 S170,20 200,90 C220,130 250,40 290,80
               C330,120 360,30 400,75 C430,110 470,50 520,95 C540,110 555,120 570,105"
        fill="none" stroke="#1a1a1a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M150,125 C240,145 380,140 480,120" fill="none" stroke="#1a1a1a"
        stroke-width="4" stroke-linecap="round" opacity=".8"/>
    </svg>
  </body></html>`);
  const sigPng = await page.screenshot({ type: 'png', omitBackground: true });
  await browser.close();
  return { sig: `data:image/png;base64,${sigPng.toString('base64')}` };
}

const { sig } = await makeAssets();

const base = (id, name, extra = {}) => ({
  id, name,
  gender: '', class_name: '高三(1)班', avatar_path: null,
  nickname: '', birthday: '', zodiac: '', wechat: '', qq: '', phone: '', email: '',
  bio: '', motto: '', future: '', first_meeting: '',
  favorite_color: '', favorite_book: '', favorite_movie: '', favorite_star: '',
  favorite_singer: '', favorite_song: '', favorite_food: '',
  dream_place: '', personality_tags: [], favorite_tags: [], custom_answers: {},
  label: '', bg_theme: 'img-1', signature: '', identity_code: '',
  is_visible: 1, created_at: `2026-03-${String(10 + id).padStart(2, '0')} 10:00:00`,
  secret_messages: [],
  ...extra,
});

const entries = [
  base(1, '林晓芸', {
    gender: '女', nickname: '小芸', avatar_path: 'uploads/avatar-ly.png',
    birthday: '2006-05-20', zodiac: '金牛座', wechat: 'xiaoyun_0605', qq: '2046188666',
    phone: '138****6688', email: 'xiaoyun@example.com',
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
    secret_messages: ['毕业快乐！记得常联系呀～', '下次见面要告诉我冰岛好不好玩！'],
  }),
  base(2, '陈子豪', {
    gender: '男', nickname: '豪哥', zodiac: '天蝎座', qq: '188666888',
    motto: '乾坤未定，你我皆是黑马。',
    bio: '篮球队 13 号，迟到大王，但值日从不偷懒。',
    future: '打一辈子篮球。',
    favorite_color: '黑金', favorite_movie: '灌篮高手', favorite_food: '烤肉', dream_place: '奈良',
    personality_tags: ['搞笑担当', '果敢强势'], favorite_tags: ['篮球', '游戏'],
    custom_answers: { '最想回到哪一天？': '赢下校赛的那个晚上' },
    label: '搞笑担当', bg_theme: 'img-5',
    secret_messages: ['作业借我抄一下（不是）'],
  }),
  base(3, '苏一然', { gender: '女', label: '学霸', bg_theme: 'img-4' }),
  base(4, '周明宇', {
    gender: '男', nickname: '阿宇', avatar_path: 'uploads/avatar-zm.png',
    birthday: '2005-09-08', zodiac: '处女座', wechat: 'mingyu_zhou',
    motto: '把每一题都当作最后一次见面。',
    bio: '物理课代表，错题本比课本还厚。',
    future: '造出中国人自己的芯片。',
    first_meeting: '分班名单出来那天，你在我名字下面一行。',
    favorite_color: '藏青', favorite_book: '三体', favorite_movie: '星际穿越',
    favorite_singer: '陈奕迅', favorite_song: '十年', favorite_food: '牛肉面', dream_place: '敦煌',
    personality_tags: ['无敌学霸', '成熟稳重'], favorite_tags: ['编程', '天文', '围棋'],
    custom_answers: { '最想回到哪一天？': '天文台看流星雨那晚' },
    label: '学霸', bg_theme: 'img-1',
    secret_messages: ['高考加油，顶峰相见！'],
  }),
  base(5, '赵一诺', {
    gender: '女', nickname: '诺诺', avatar_path: 'uploads/avatar-zy.png',
    birthday: '2006-01-11', zodiac: '摩羯座', phone: '139****2333',
    motto: '慢慢来，比较快。',
    bio: '广播站站长，用声音记录过整个校园的四季。',
    future: '做一名战地记者（或者美食博主）。',
    favorite_color: '抹茶绿', favorite_movie: '海街日记', favorite_food: '抹茶千层',
    dream_place: '京都', personality_tags: ['古灵精怪', '心地善良'],
    favorite_tags: ['播音', '旅行', '摄影'],
    custom_answers: { '给十年后的自己一句话': '记得回学校看看' },
    label: '文艺担当', bg_theme: 'img-3',
    secret_messages: ['你的声音是我高中最好的闹钟。'],
  }),
  base(6, '王梓萱', {
    gender: '女', motto: '心有猛虎，细嗅蔷薇。',
    bio: '田径队 4×100 第三棒，摔过跤但从没弃过棒。',
    favorite_color: '樱粉', favorite_singer: ' Taylor Swift', favorite_song: 'Love Story',
    dream_place: '纽约', personality_tags: ['果敢强势'],
    favorite_tags: ['跑步', '英语'], label: '元气担当', bg_theme: 'img-6', signature: sig,
  }),
  base(7, '李昊然', { gender: '男', motto: '来都来了。', label: '气氛组', bg_theme: 'img-2', future: '环游世界！' }),
  base(8, '隐藏同学', { is_visible: 0, label: '不该出现', bg_theme: 'img-1' }),
];

writeFileSync(join(DEMO, 'entries.json'), JSON.stringify(entries, null, 2), 'utf-8');
console.log('演示数据: 7 条可见 + 1 条隐藏');

const out = join(ROOT, '测试同学录.pdf');
const r = spawnSync(process.execPath, [
  join(ROOT, 'scripts', 'generate-pdf.js'),
  join(DEMO, 'entries.json'),
  join(DEMO, 'uploads'),
  out,
], { stdio: 'inherit', cwd: ROOT });
if (r.status !== 0 || !existsSync(out)) {
  console.error('生成失败');
  process.exit(1);
}
console.log(`✅ ${out}`);
