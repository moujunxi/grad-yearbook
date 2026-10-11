/* PDF 端到端测试——项目根目录运行：
 *   1) cd server && PORT=3210 PUPPETEER_EXECUTABLE_PATH=<Chrome路径> node index.js
 *   2) node tests/_pdf_e2e_test.mjs（生成 test-output.pdf 后可再跑 python tests/_pdf_check.py）
 */
/* 端到端 PDF 测试：注入载荷 → 生成 PDF → 检查字面文本与页数 */
import { writeFileSync } from 'node:fs';

const base = 'http://localhost:3210';

const login = await (await fetch(base + '/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})).json();
const H = { Authorization: `Bearer ${login.token}` };

// 创建身份码（容忍重复）
await fetch(base + '/api/admin/identity-codes', {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'PDFTEST', blessing_message: '测试祝福' }),
});

// 提交注入载荷条目（合法 dataURL 签名 + 恶意文本字段）
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const fd = new FormData();
fd.append('name', '<b>李四</b>');
fd.append('bg_theme', 'img-1');
fd.append('class_name', '高三(2)班');
fd.append('identity_code', 'PDFTEST');
fd.append('favorite_tags', JSON.stringify(['<iframe src=javascript:alert(1)>', '篮球']));
fd.append('personality_tags', JSON.stringify(['<script>x</script>']));
fd.append('custom_answers', JSON.stringify({ 'q<svg onload=a>': 'a</p><script>2</script>' }));
fd.append('secret_message', '<svg onload=alert(4)>神秘留言');
fd.append('favorite_color', '" onerror="alert(1)');
fd.append('bio', '我叫$测试$&引号');
fd.append('signature', tinyPng);
const submit = await fetch(base + '/api/entries', { method: 'POST', body: fd });
const entry = await submit.json();
console.log('submit:', submit.status, JSON.stringify(entry));

// 生成 PDF
const t0 = Date.now();
const pdfRes = await fetch(base + '/api/admin/export/pdf', { headers: H });
console.log('pdf status:', pdfRes.status, 'type:', pdfRes.headers.get('content-type'));
if (!pdfRes.ok) {
  console.log('PDF FAIL:', await pdfRes.text());
  process.exit(1);
}
const buf = Buffer.from(await pdfRes.arrayBuffer());
writeFileSync('test-output.pdf', buf);
console.log(`pdf bytes=${buf.length} elapsed=${Date.now() - t0}ms`);

// 清理测试条目
await fetch(base + `/api/admin/entries/${entry.id}`, { method: 'DELETE', headers: H });
console.log('entry cleaned');
