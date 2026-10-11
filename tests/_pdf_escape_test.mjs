/* PDF 渲染层单元测试（转义/数组防御）——项目根目录运行：node tests/_pdf_escape_test.mjs
 * 依赖 server/node_modules，无需启动服务。
 */
/* 验证 PDF 渲染层 HTML 转义 + 数组防御 */
import { renderEntry } from '../server/pdf/generator.js';

let fail = 0;
const check = (cond, name) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) fail++;
};

const evil = {
  id: 1,
  name: '<b>李四</b>',
  gender: '男',
  class_name: '<script>x</script>',
  avatar_path: null,
  nickname: '<img src=x onerror=alert(1)>',
  birthday: '',
  zodiac: '',
  wechat: '', qq: '', phone: '', email: '',
  favorite_color: '" onerror="alert(1)',
  favorite_book: '', favorite_movie: '', favorite_star: '',
  favorite_singer: '', favorite_song: '', favorite_food: '', dream_place: '',
  future: '<iframe src=javascript:alert(1)>',
  first_meeting: '<svg onload=alert(2)>',
  personality_tags: '<script>x</script>', // 故意给字符串而非数组
  favorite_tags: ['<iframe src=javascript:alert(1)>'],
  custom_answers: { 'q<svg onload=a>': '<svg onload=alert(3)>' },
  label: '<script>1</script>',
  bio: '&lt;already&gt;',
  motto: "it's $& $' test",
  bg_theme: 'img-1',
  signature: 'javascript:alert(9)', // 非 data:image → 应被丢弃
  is_visible: 1,
};

const html = renderEntry(evil, ['<svg onload=alert(4)>']);

check(!html.includes('<b>李四</b>'), '姓名 HTML 被转义');
check(html.includes('&lt;b&gt;李四&lt;/b&gt;'), '姓名转义结果正确');
check(!/<script>x<\/script>/.test(html), 'script 标签被转义');
check(!html.includes('<iframe'), 'iframe 被转义');
check(!html.includes('<svg onload'), 'svg onload 被转义');
check(!html.includes('onerror="alert'), '属性注入被转义');
check(!/src="javascript:/.test(html), '非白名单签名被丢弃');
check(!html.includes('<div class="signature-box">'), '签名块不渲染（非法签名）');
check(html.includes('&amp;lt;already&amp;gt;'), '普通文本 & 被正确转义（双重转义安全）');
check(html.includes("it's $&amp;") || html.includes("it&#39;s $&amp;"), '$ 序列与引号处理');

// 数组防御：字符串 personality_tags 不应崩溃
check(!html.includes('{{'), '模板占位符全部替换');

// 空字段条目不崩溃
try {
  const html2 = renderEntry({ id: 2, name: '空', bg_theme: 'img-1', favorite_tags: [], personality_tags: [], custom_answers: {} }, []);
  check(html2.includes('空'), '空字段条目渲染正常');
} catch (e) {
  check(false, '空字段条目渲染崩溃: ' + e.message);
}

console.log(fail ? `\n${fail} 项失败` : '\nPDF 渲染层测试全部通过');
process.exit(fail ? 1 : 0);
