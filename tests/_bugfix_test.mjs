/* 回归测试（对应 BUG报告.md 的接口修复项）
 * 运行方式（项目根目录）：
 *   1) cd server && PORT=3210 node index.js
 *   2) node tests/_bugfix_test.mjs
 * 注意：会启用登录限流（约 1 分钟窗口），重复运行需间隔。
 */
/* 回归测试：针对 BUG报告.md 中修复的问题 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const base = 'http://localhost:3210';
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`✅ ${name} ${extra}`); }
  else { fail++; console.log(`❌ ${name} ${extra}`); }
};

async function api(method, path, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    if (body instanceof FormData) payload = body;
    else { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  if (raw) return { status: res.status, res };
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function form(fields, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append('avatar', new Blob([file.buf], { type: file.mime }), file.name);
  return fd;
}

const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// 登录
let r = await api('POST', '/api/admin/login', { body: { username: 'admin', password: 'admin123' } });
ok(r.status === 200 && r.data.token, '登录');
const token = r.data.token;

// 身份码（容忍重复创建）
r = await api('POST', '/api/admin/identity-codes', { token, body: { code: 'GRAD2026', blessing_message: '祝你前程似锦' } });
ok(r.status === 201 || r.status === 409, '创建身份码', `status=${r.status}`);

// 1. 正常提交（头像 + 身份码 + 标签）
r = await api('POST', '/api/entries', {
  body: form({
    name: '张三', gender: '男', class_name: '高三(1)班', bg_theme: 'img-2',
    identity_code: 'GRAD2026', favorite_tags: '["篮球","音乐"]',
    personality_tags: '["活泼可爱"]', custom_answers: '{"最喜欢的老师":"李老师"}',
    secret_message: '祝你一路顺风',
  }, { buf: tinyPng, mime: 'image/png', name: 'tiny.png' }),
});
ok(r.status === 201, '学生正常提交', `status=${r.status} ${JSON.stringify(r.data)}`);
const entryId = r.data?.id;

// 2. 无效主题 → 400
r = await api('POST', '/api/entries', { body: form({ name: '李四', bg_theme: 'pattern-dots' }) });
ok(r.status === 400, '无效主题拒绝', `status=${r.status} ${JSON.stringify(r.data)}`);

// 3. 无效身份码 → 400
r = await api('POST', '/api/entries', { body: form({ name: '王五', bg_theme: 'img-1', identity_code: 'NOT-A-CODE' }) });
ok(r.status === 400, '无效身份码拒绝', `status=${r.status} ${JSON.stringify(r.data)}`);

// 4. 伪造扩展名 evil.html（声明 image/png）→ 存储时扩展名应收敛为白名单
r = await api('POST', '/api/entries', {
  body: form({ name: 'XSS', bg_theme: 'img-1' }, { buf: Buffer.from('<html><script>alert(1)</script></html>'), mime: 'image/png', name: 'evil.html' }),
});
ok(r.status === 201, '伪装扩展名提交（文件被改名）');
let detail = await api('GET', `/api/admin/entries/${r.data.id}`, { token });
ok(/\.(jpg|png|gif|webp)$/.test(detail.data?.avatar_path || ''), '存储扩展名安全', `avatar_path=${detail.data?.avatar_path}`);
await api('DELETE', `/api/admin/entries/${r.data.id}`, { token });

// 5. 超过 5MB → 413
r = await api('POST', '/api/entries', {
  body: form({ name: 'Big', bg_theme: 'img-1' }, { buf: Buffer.alloc(6 * 1024 * 1024), mime: 'image/png', name: 'big.png' }),
});
ok(r.status === 413, '超大文件 413', `status=${r.status} ${JSON.stringify(r.data)}`);

// 6. 后台列表（列映射）
r = await api('GET', '/api/admin/entries', { token });
const row = r.data?.rows?.[0];
ok(r.status === 200 && row && row.name === '张三改' || row?.name === '张三', '后台列表列映射',
  `name=${row?.name} tags=${JSON.stringify(row?.favorite_tags)} theme=${row?.bg_theme} vis=${row?.is_visible} created=${row?.created_at}`);

// 7. 详情
r = await api('GET', `/api/admin/entries/${entryId}`, { token });
ok(r.status === 200 && Array.isArray(r.data?.personality_tags) && r.data.identity_code === 'GRAD2026',
  '详情字段正确', `personality=${JSON.stringify(r.data?.personality_tags)} identity=${r.data?.identity_code} msgs=${r.data?.secret_messages?.length}`);

// 8. 局部编辑：只改 name，其它字段保留
r = await api('PUT', `/api/admin/entries/${entryId}`, { token, body: { name: '张三改' } });
ok(r.status === 200, '局部编辑成功');
r = await api('GET', `/api/admin/entries/${entryId}`, { token });
ok(r.data?.name === '张三改' && r.data?.identity_code === 'GRAD2026' && r.data?.bg_theme === 'img-2'
  && r.data?.secret_messages?.length === 1, '未提交字段未被清空',
  `name=${r.data?.name} identity=${r.data?.identity_code} theme=${r.data?.bg_theme} msgs=${r.data?.secret_messages?.length}`);

// 9. 编辑不存在条目 → 404
r = await api('PUT', '/api/admin/entries/999999', { token, body: { name: 'x' } });
ok(r.status === 404, '编辑不存在条目 404', `status=${r.status}`);

// 10. 可见性切换
r = await api('PATCH', `/api/admin/entries/${entryId}/visibility`, { token });
ok(r.status === 200 && (r.data?.is_visible === 0 || r.data?.is_visible === 1), '可见性切换', JSON.stringify(r.data));
r = await api('PATCH', '/api/admin/entries/999999/visibility', { token });
ok(r.status === 404, '可见性不存在 404', `status=${r.status}`);
await api('PATCH', `/api/admin/entries/${entryId}/visibility`, { token }); // 切回可见

// 11. JSON 导出
r = await api('GET', '/api/admin/export/json', { token });
ok(r.status === 200 && Array.isArray(r.data) && r.data.every((e) => Array.isArray(e.favorite_tags)),
  'JSON 导出', `count=${Array.isArray(r.data) ? r.data.length : r.data}`);

// 12. Excel 导出
r = await api('GET', '/api/admin/export/excel', { token });
ok(r.status === 200, 'Excel 导出', `status=${r.status}`);

// 13. 配置数组类型不被写坏
r = await api('PUT', '/api/admin/config', { token, body: { custom_questions: ['问题A', '问题B'] } });
ok(r.status === 200, '配置写入数组');
r = await api('GET', '/api/config/questions');
ok(r.status === 200 && Array.isArray(r.data) && r.data.length === 2, '公开配置读取数组', JSON.stringify(r.data));

// 14. site_open 服务端校验
await api('PUT', '/api/admin/config', { token, body: { site_open: '0' } });
r = await api('POST', '/api/entries', { body: form({ name: '截止后', bg_theme: 'img-1' }) });
ok(r.status === 403, '关闭后提交 403', `status=${r.status} ${JSON.stringify(r.data)}`);
await api('PUT', '/api/admin/config', { token, body: { site_open: '1' } });

// 15. 统计
r = await api('GET', '/api/admin/stats', { token });
ok(r.status === 200 && typeof r.data?.total === 'number', '统计接口', `total=${r.data?.total}`);

// 16. 身份码查询
r = await api('GET', '/api/identity/lookup?code=GRAD2026');
ok(r.data?.valid === true, '身份码查询有效', JSON.stringify(r.data));
r = await api('GET', '/api/identity/lookup?code=WRONG');
ok(r.data?.valid === false, '身份码查询无效', JSON.stringify(r.data));

// 17. 修改密码（错误当前密码 → 401；正确 → 200；改回）
r = await api('PUT', '/api/admin/password', { token, body: { current_password: 'wrong', new_password: 'newpass99' } });
ok(r.status === 401, '改密码-错误当前密码 401', `status=${r.status}`);
r = await api('PUT', '/api/admin/password', { token, body: { current_password: 'admin123', new_password: 'newpass99' } });
ok(r.status === 200, '改密码成功');
r = await api('POST', '/api/admin/login', { body: { username: 'admin', password: 'newpass99' } });
ok(r.status === 200, '新密码登录');
const token2 = r.data.token;
await api('PUT', '/api/admin/password', { token: token2, body: { current_password: 'newpass99', new_password: 'admin123' } });

// 18. 删除条目时清理头像文件
detail = await api('GET', `/api/admin/entries/${entryId}`, { token });
const avatarAbs = join(process.cwd(), 'server', detail.data.avatar_path);
ok(existsSync(avatarAbs), '头像文件存在（删除前）', avatarAbs);
r = await api('DELETE', `/api/admin/entries/${entryId}`, { token });
ok(r.status === 200, '删除条目');
ok(!existsSync(avatarAbs), '头像文件已清理');
r = await api('DELETE', '/api/admin/entries/999999', { token });
ok(r.status === 404, '删除不存在条目 404', `status=${r.status}`);

// 19. 登录限流（11 次失败尝试 → 429）
let got429 = false;
for (let i = 0; i < 12; i++) {
  const lr = await api('POST', '/api/admin/login', { body: { username: 'admin', password: 'bad' } });
  if (lr.status === 429) { got429 = true; break; }
}
ok(got429, '登录频率限制 429');

// 20. 越权 / 未带 token → 401
r = await api('GET', '/api/admin/entries');
ok(r.status === 401, '未登录 401', `status=${r.status}`);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
