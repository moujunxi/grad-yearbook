# 《同学录》项目 Bug 审查报告

- 审查对象：`D:\Desktop\grad-yearbook-master`（React 18 + Vite 前端 / Express 4 + sql.js 后端 / Puppeteer PDF）
- 审查方式：全量通读源码 + 隔离探针实测（不修改原项目，探针运行在临时目录，用真实 `schema.sql`、真实的 multer/生成器代码路径复现）
- 结论：**结果与 README 描述严重不符——"导出 PDF/Excel/JSON"与"条目管理"这些核心功能在当前代码下要么直接 500，要么静默写坏数据。** 下文每条都标出「实测证据」。

---

## 一、问题总览（按严重程度排序）

| # | 严重度 | 问题 | 位置 |
| :--- | :--- | :--- | :--- |
| 1 | 🔴 致命 | 3 处后台接口 + PDF 生成器的列映射与真实表结构不一致：新库上所有相关接口 500；老库上静默错位脏数据，PDF 报错 | `server/routes/admin/entries.js:6-18`、`server/routes/admin/export.js:7-21`、`server/pdf/generator.js:135-146` |
| 2 | 🔴 致命 | PDF 生成器对 `favorite_tags` / `personality_tags` 不做 `JSON.parse` 就 `.map()`，必然抛错 | `server/pdf/generator.js:85,87` |
| 3 | 🔴 致命 | 后台"编辑"表单提交的字段，被后端按另一套语义写回：签名 ← 主题、身份码 ← 签名，并清空所有未提交字段 | `client/src/pages/admin/EditEntryPage.jsx:31`、`server/routes/admin/entries.js:70-83` |
| 4 | 🟠 高 | PDF 用 `String.replace` 拼 HTML，**零转义**，学生任意字段可注入 HTML/脚本，且在服务器无头浏览器里渲染 | `server/pdf/generator.js:54-106` |
| 5 | 🟠 高 | 可见性切换接口永不生效，且对不存在的 id 也返回"成功" | `server/routes/admin/entries.js:90-100` |
| 6 | 🟠 高 | 提交接口先落盘头像文件再做 JSON 校验：非法提交会 500 并留下孤立文件（无清理逻辑） | `server/routes/entries.js:21-60` |
| 7 | 🟠 高 | 上传文件扩展名直接取自 `originalname`，可上传 `x.html` 并通过 `/uploads` 静态访问 → 存储型 XSS | `server/routes/entries.js:9-19`、`server/index.js:35` |
| 8 | 🟠 高 | 登录、身份码查询、提交接口均无频率限制；JWT 密钥有硬编码兜底；CORS 全开 | `server/routes/auth.js:6-27`、`server/routes/identity.js:7-22`、`server/middleware/auth.js:2`、`server/index.js:33` |
| 9 | 🟠 高 | 数据库每次写操作都全量 `export()` + `writeFileSync`，无并发保护、无临时文件+rename，高频提交存在丢数据/损坏风险 | `server/db/init.js:14-18,64-66` |
| 10 | 🟡 中 | 前端表单默认主题 `pattern-dots` 在两处白名单里都不存在，未选主题的学生卡片背景异常 | `client/src/pages/FormPage.jsx:39`、`client/src/config/themes.js:1-26` |
| 11 | 🟡 中 | 卡片可见性为 0 条时 PDF 生成崩溃（`rows[0].values` 未判空） | `server/pdf/generator.js:134-135` |
| 12 | 🟡 中 | PDF 导出不按 `is_visible` 过滤；目录页码按"每人一页"硬算且无分页控制 | `server/pdf/generator.js:164-165` |
| 13 | 🟡 中 | `site_open`（收集截止）只在前端判断，绕过前端直接 POST 仍可写入 | `server/routes/entries.js:21`、`client/src/pages/FormPage.jsx:96` |
| 14 | 🟡 中 | `PUT /api/admin/config` 用 `String(v)` 强转，数组类配置（自定义问题）会被写成逗号串，公开接口 `JSON.parse` 失败 → 500 | `server/routes/admin/config.js:19-24`、`server/routes/config.js:6-15` |
| 15 | 🟡 中 | 身份验证码只在前端"匹配后显示祝福语"，后端从不校验；任意码都能入库 | `client/src/components/IdentityCodeInput.jsx:19`、`server/routes/entries.js:30-31` |
| 16 | 🟡 中 | 提交 / 编辑用 `JSON.parse` 解析客户端字段，坏数据直接 500；无任何长度上限，可刷库 | `server/routes/entries.js:25-27`、`server/routes/admin/entries.js:70-83` |
| 17 | 🟡 中 | 数据库迁移新增列的顺序与 `schema.sql` 不一致（根因），且迁移列表漏了 `is_visible`/`created_at` | `server/db/init.js:39-49` |
| 18 | 🟡 中 | 删除条目只删表记录，磁盘上的头像文件永久残留；`data.db` 路径为相对路径 | `server/routes/admin/entries.js:103-111`、`server/db/init.js:8` |
| 19 | 🟡 中 | 主题白名单不做服务端校验，任意字符串入库后依赖前端兜底 | `server/routes/entries.js:44`、`server/pdf/generator.js:24-42` |
| 20 | 🟢 低 | 未配置 `uploads` 目录自动创建（部署文档里有 `mkdir`，代码里没有）→ 首次上传 500 ENOENT | `server/routes/entries.js:10`、`server/index.js:35` |
| 21 | 🟢 低 | 超过 5MB 的图片返回 multer 默认 500 `File too large`，前端提示不友好 | `server/routes/entries.js:16` |
| 22 | 🟢 低 | 所有 catch 都把内部错误 `e.message` 直接回给调用方 | 各路由 `catch` |
| 23 | 🟢 低 | 错误处理的"复制粘贴"式重复：同一份 `rowToEntry/getEntries` 逻辑散落 3 个文件 | 见问题 1 位置 |
| 24 | 🟢 低 | 客户端 axios 仅返回 `err`，未取 `err.response.data.error` 展示 | `client/src/utils/request.js:11-20` |
| 25 | 🟢 低 | `SECRET_MESSAGES` 空留言入库（列表 `content != ""` 与详情接口行为不一致） | `server/routes/entries.js:49`、`server/routes/admin/entries.js:55-59` |
| 26 | 🟢 低 | Excel 导出列不全（缺 favorite_tags/custom_answers/bio/motto/identity_code），数组字段直接 `toString` | `server/routes/admin/export.js:46-61` |
| 27 | 🟢 低 | 管理页无"修改密码"入口，默认口令 `admin/admin123` 与 README 明文一致 | `server/db/init.js:51-56`、`README.md:80` |
| 28 | 🟢 低 | 文档与实现不符：README 写"12 款主题（4 纯色 + 4 渐变 + 4 花纹）"，实际 `themes.js` 只有 6 个图片背景 | `README.md:44`、`client/src/config/themes.js:1-26` |
| 29 | 🟢 低 | 统计接口 `date(created_at)`/分组未排除异常数据 | `server/routes/admin/stats.js:9-12` |

> 说明：问题 1 是"一个根因、三处复制"，故合并；其余独立列出。下面详述关键问题。

---

## 二、致命问题详解

### 问题 1：列映射与真实表结构不一致（后台接口全线失效 / 静默写坏数据）

**代码**（三处完全一样，`server/routes/admin/entries.js:6-18`、`server/routes/admin/export.js:7-21`、`server/pdf/generator.js:135-146`）：

```js
function rowToEntry(r) {
  return { id: r[0], name: r[1], gender: r[2], class_name: r[3], avatar_path: r[4],
    wechat: r[5], qq: r[6], phone: r[7], email: r[8], bio: r[9], motto: r[10],
    future: r[11], favorite_tags: JSON.parse(r[12]||'[]'), custom_answers: JSON.parse(r[13]||'{}'),
    label: r[14], bg_theme: r[15], signature: r[16], identity_code: r[17],
    is_visible: r[18], created_at: r[19],
    nickname: r[20], birthday: r[21], zodiac: r[22],
    favorite_color: r[23], favorite_book: r[24], favorite_movie: r[25],
    favorite_star: r[26], favorite_singer: r[27], favorite_song: r[28],
    favorite_food: r[29], dream_place: r[30], first_meeting: r[31],
    personality_tags: JSON.parse(r[32]||'[]'),
  };
}
```

**真实表结构**（`server/db/schema.sql:1-35`，实测 `SELECT *` 列顺序一致）：

```
0:id 1:name 2:gender 3:class_name 4:avatar_path 5:wechat 6:qq 7:phone 8:email 9:bio 10:motto
11:future 12:favorite_tags 13:custom_answers 14:label 15:bg_theme
16:signature 17:identity_code 18:nickname 19:birthday 20:zodiac
21:favorite_color 22:favorite_book 23:favorite_movie 24:favorite_star 25:favorite_singer
26:favorite_song 27:favorite_food 28:dream_place 29:first_meeting 30:personality_tags
31:is_visible 32:created_at
```

从 **下标 16 开始全部错位一格**：代码以为 `r[16]=signature`，实际是 `signature` 后移了一位；代码以为 `r[32]=personality_tags`，实际 `r[32]=created_at`（时间字符串）。

**实测证据**（探针对真实 `.db` 执行同一映射）：

```
GET /api/admin/entries（列表）        -> SyntaxError: Unexpected non-whitespace character after JSON at position 4 (line 1 column 5)
GET /api/admin/entries/export/json   -> 同上
GET /api/admin/entries/:id（详情）    -> 同上
```

崩溃点是 `JSON.parse(r[12]||'[]')`：新库里 `r[12]` 是 `favorite_tags`，本身是 JSON 字符串（能过），继续走下去 `JSON.parse(r[18])` 解析的是 `nickname`（如"四哥"）→ 抛 `SyntaxError`。**只要库里有任意一条数据，后台列表、详情、JSON 导出全部 500。**

**老库更隐蔽**：`server/db/init.js:39-49` 的兼容迁移用 `ALTER TABLE ... ADD COLUMN` 追加新列，实测迁移后列顺序变成：

```
... 14:label 15:bg_theme 16:is_visible 17:created_at 18:signature 19:identity_code ...
```

于是后台读写稳定错位，功能"看起来正常但数据全错"：

- `GET /api/admin/entries/:id` 详情页显示的"昵称"其实是签名 dataURL，"身份码"其实是 `bg_theme`；
- `PUT` 编辑把 `signature` 写回成 `bg_theme`、`identity_code` 写回成旧签名值 → 与问题 3 叠加，**一次"编辑保存"就能破坏一条同学信息**；
- PDF 用老库的 `r[12]`（JSON）能过，但到 `r[29]`（迁移后是 `favorite_food` 纯文本）执行 `JSON.parse` → 抛错。

**修复建议**：删掉三处手写映射，改为按列名取值（`db.prepare('SELECT ...').getColumnNames()` 或显式 `SELECT` 列清单 + 对象映射），并把映射抽成一个共享模块；同时把迁移逻辑改成"新建表 + `INSERT INTO ... SELECT` 重排"以统一列序。

---

### 问题 2：PDF 生成器与 JSON 字段类型不匹配，必然失败

```js
// server/pdf/generator.js:85,87
.replace('{{PERSONALITY_HTML}}', e.personality_tags?.length ? `...${e.personality_tags.map(...)}` : '')
.replace('{{TAGS_HTML}}',        e.favorite_tags?.length   ? `...${e.favorite_tags.map(...)}`   : '')
```

`personality_tags` / `favorite_tags` 在数据库里是 `JSON.stringify(...)` 后的**字符串**（`server/routes/entries.js:41,43`），字符串有 `.length`，因此必进 `.map()`。

实测（修正问题 1 的索引后仍复现）：

```
TypeError: e.personality_tags.map is not a function
    at renderEntry (pdf/generator.js:85)
```

**修复建议**：映射层统一 `JSON.parse` 并加 try/catch 兜底（见问题 1），渲染层再对非数组做防御。

---

### 问题 3：后台"编辑"保存会写坏/清空数据

前端编辑页只提交部分字段（`client/src/pages/admin/EditEntryPage.jsx:31`）：

```js
['gender','class_name','wechat','qq','phone','email','bio','motto','future','label','bg_theme']
  .forEach(k => fd.append(k, data[k] || ''));
```

而后端 `PUT /api/admin/entries/:id` 无条件 `UPDATE` 全部 30 个字段，缺失的一律取 `|| ''`（`server/routes/admin/entries.js:70-83`），并且 `bg_theme` 缺失时回落到一个不存在的 `'pattern-dots'`。

实测（直接复刻该 SQL 与请求体）：

```
更新前: ["张三","data:image/png;base64,AAA\" onerror=\"document.title=1","","",""]   // name, signature, identity_code, birthday, favorite_color
更新后: ["张三改","","","","","pattern-dots"]                                        // 签名/身份码/生日/喜好全被清空
```

叠加问题 1 的错位后更糟：老库上"主题"会被写进 `signature` 列、"签名"会被写进 `identity_code` 列。

**修复建议**：`PUT` 改为按请求中实际存在的键做动态 `SET`（白名单字段 + `undefined` 跳过），并在更新前 `SELECT` 校验记录存在；`bg_theme` 兜底值改为真实存在的主题 key。

---

### 问题 4：PDF（服务器端无头浏览器）HTML 注入

`server/pdf/generator.js:54-106` 全部用 `.replace('{{X}}', e.name)` 直接拼接，模板里没有转义：

```js
.replace('{{MEETING_HTML}}', e.first_meeting ? `<div class="future-box">...<p>${e.first_meeting}</p></div>` : '')
```

实测：把 HTML 片段作为学生字段存入后调用真实的 `generatePdf()` 路径（仅替换 puppeteer 为空壳），捕获到的送渲染 HTML：

```
HTML 长度: 2090471
未转义出现  "<b>李四</b>"          （姓名）
未转义出现  "onerror=alert(1)"      （favorite_color）
未转义出现  "<script>x</script>"    （性格标签）
未转义出现  "<iframe src=javascript:alert(1)>"  （兴趣标签）
未转义出现  "<svg onload=alert(2)>" （自定义问答）
未转义出现  "onerror=\"document.title=1"        （手写签名）
未转义出现  "<svg onload=alert(3)>" （私密留言）
HTML 中 &amp; 次数: 0，&lt; 次数: 0
```

即 **学生端提交的姓名/标签/签名/留言可原样成为在服务器 Chromium 中执行的脚本**（可探测内网、卡死渲染进程、伪造卡片内容）。

**修复建议**：加统一 `escapeHtml()`（`& < > " '`）用于所有插值，或改用模板引擎（EJS/Handlebars 默认转义）；只对已知的 `data:image/...` 前缀做图片白名单放行。

---

## 三、高危问题详解

### 问题 5：可见性切换永不生效

```js
// server/routes/admin/entries.js:90-100
const s = db.prepare('SELECT is_visible FROM entries WHERE id = ?');
s.bind([+req.params.id]);
s.step(); const v = s.get()[0]; s.free();     // ← s.get() 之后游标已消费/未判断是否存在
db.run('UPDATE entries SET is_visible = ? WHERE id = ?', [v ? 0 : 1, +req.params.id]);
res.json({ is_visible: v ? 0 : 1 });
```

实测：

```
PATCH visibility id=999999 -> 读取到 v=undefined，响应 {is_visible:1}，但数据库无此记录（前端会显示成功）
```

- 对不存在的 id：返回"成功"，前端 toast 正常，实际什么都没改；
- 由于问题 1，`v` 的取值语义也不可信（老库上读到的位置会偏移）；
- 正确写法：`if (!s.step()) return res.status(404)...` 后再取 `get()`，用 `UPDATE ... RETURNING` 或重新查询确认。

### 问题 6：上传先落盘，校验在后

`upload.single('avatar')` 先把文件写入 `server/uploads/`，随后 25-27 行的 `JSON.parse(b.favorite_tags)` 才可能抛错 → 返回 500，但文件已留下。全仓库搜索无 `unlink/rm` 调用，**孤立文件永久累积**（也适用于"提交成功但用户立即关闭页面"之外的失败路径）。

**修复建议**：把 JSON 解析/校验前置（或在 catch 中 `unlink(req.file.path)`）；限制字段长度；对同一 IP 做提交限流。

### 问题 7：上传扩展名不可信 → 存储型 XSS

```js
// server/routes/entries.js:9-19
const storage = multer.diskStorage({
  destination: join(import.meta.dirname, '..', 'uploads'),
  filename: (_r, f, cb) => cb(null, randomUUID() + extname(f.originalname)),  // ← 用原始文件名后缀
});
const upload = multer({ storage, limits: { fileSize: 5*1024*1024 },
  fileFilter: (_r, f, cb) => cb(null, ['image/jpeg',...].includes(f.mimetype)) });  // ← 只看客户端声明的 MIME
```

实测（真实 multer 处理 multipart，`originalname=evil.html`、`Content-Type` 声明为 `image/png`）：

```
场景B 扩展名伪装: 201 {"ok":true,"file":"234e3206-20dd-4759-a060-b740aec531ed.html"}
```

文件可通过 `/uploads/<uuid>.html` 直接访问（`server/index.js:35` `express.static` 未设 `X-Content-Type-Options`），可被当作 HTML 执行 → 存储型 XSS / 钓鱼页托管。

**修复建议**：服务端按 MIME 白名单决定扩展名（或统一存为 `.bin` + 独立下载响应头 `Content-Disposition: attachment`、`X-Content-Type-Options: nosniff`）；条件允许时校验文件magic bytes。

### 问题 8：认证与接口暴露面

- `server/routes/auth.js:9-27` 登录无失败计数/锁定/IP 限流，配合默认口令 `admin/admin123`（`server/db/init.js:54`）可被在线爆破；
- `server/routes/identity.js:7-22` 身份码查询无频控，可枚举祝福语；
- `server/middleware/auth.js:2` 与 `server/routes/auth.js:6` 均有 `process.env.JWT_SECRET || '6f-classmates-secret'` 硬编码兜底 —— 若生产忘配环境变量，任何人都能用公开密钥签发管理员 token；
- `server/index.js:33` `app.use(cors())` 全开，配合后台 token 存 `localStorage`，任意站点可跨域调用 API。

**修复建议**：启动时强校验 `JWT_SECRET` 必须存在且足够长（否则退出）；登录加失败限流（如 express-rate-limit）；身份码查询加限流；CORS 限定为站点自身域名。

### 问题 9：数据库写入策略

```js
// server/db/init.js:14-18, 64-66
function saveToDisk() { ... writeFileSync(DB_PATH, Buffer.from(db.export())); }
export function persist() { saveToDisk(); }
```

每次提交/编辑/开关都全量序列化整个数据库并**同步覆盖写**：无临时文件 + rename（写到一半进程崩溃即损坏）、无写入队列（并发请求交错落盘可能丢数据）、数据量大后每次写都阻塞事件循环。README 的部署方式是 PM2 单进程，尚能勉强运行，但属于明确的设计风险。

**修复建议**：至少改为 `writeFileSync(tmp) + renameSync`，并加简单串行化（写队列 / 防抖合并）；数据量增长后建议换 `better-sqlite3`。

---

## 四、中低危问题补充证据

- **问题 10（默认主题不存在）**：`client/src/pages/FormPage.jsx:39` 的 `defaultValues.bg_theme = 'pattern-dots'` 会覆盖 `client/src/schemas/entrySchema.js:43` 的 `.default('img-1')`；`client/src/config/themes.js` 只有 `img-1..img-6`。服务端 `server/routes/entries.js:44` 兜底值同样是 `'pattern-dots'`。实测：`bg_theme=not-a-real-theme` 与 `pattern-dots` 在客户端 `find(...) || themes[0]` 与 PDF `IMAGE_FILES[key] || img-1` 处都走兜底。**结果：不主动选主题的学生，卡片主题记录与展示不一致（客户端第 1 张背景图 / PDF 第 1 张背景图），且后台显示一个不存在的 key。**
- **问题 11（空库崩溃）**：`server/pdf/generator.js:134-135` 的 `(rows[0]?.values || [])` 写法看似安全，实际 `rows` 为 `[]` 时取 `rows[0].values`。实测：`隐藏全部卡片后 rows = [] → TypeError: Cannot read properties of undefined (reading 'values')`。即"全部隐藏后再导出 PDF"直接 500。
- **问题 12（导出范围/页码）**：`generatePdf()` 的查询带 `WHERE is_visible = 1`，但后台"导出 PDF"按钮语义是导出全部；`tocRows` 用 `i + 3` 推算页码，而卡片固定 `297mm` 高且无分页控制，长内容会被裁切、页码与实际不符。
- **问题 14（配置被写坏）**：`server/routes/admin/config.js:22-23` 的 `String(v)`，若前端把 `custom_questions` 作为数组提交（而非 JSON 字符串），会落库成 `a,b,c`，随后公开接口 `server/routes/config.js:11` 的 `JSON.parse(raw)` 抛错 → 500。
- **问题 16（无长度限制）**：`client/src/schemas/entrySchema.js` 有 `max(50/100/500)` 等限制，但服务端完全不校验；`server/routes/entries.js:34-45` 直接字符串入库，可提交超长内容或高并发刷量。
- **问题 17（迁移根因）**：实测迁移后 `... 16:is_visible 17:created_at 18:signature 19:identity_code ...`，与 `schema.sql` 顺序不等（探针输出 `schema.sql 顺序 vs 迁移后顺序 是否一致: false`）；迁移列清单也没有 `is_visible`/`created_at`（早期库若缺这两列无法补齐）。
- **问题 20（首次上传 500）**：`server/uploads` 目录在仓库里只有 `.gitkeep`（实测 `Test-Path server\uploads = True`，内容仅 `.gitkeep`），`server/routes/entries.js:10` 不创建目录。实测真实 multer：`场景A 目录不存在时上传: 500 {"error":"ENOENT: no such file or directory, open '...\\uploads\\4d25d29e-....png'"}`。`部署.md:127` 有 `mkdir -p .../server/uploads` 步骤，代码侧建议启动时自建。
- **问题 21（超限提示）**：实测 `场景C 超过 5MB: 500 {"error":"File too large"}`，非 4xx 语义，前端只会显示通用失败。
- **问题 26（Excel 列不全）**：`server/routes/admin/export.js:46-59` 只声明到"签名/可见/时间"，缺 `favorite_tags`、`custom_answers`、`bio`、`motto`、`identity_code`；数组/对象字段直接作为单元格值 `toString`，导出结果是 `a,b` 形式且没有表头宽度设置。
- **问题 28（文档不符）**：`README.md:44` 称主题 12 款（4 纯色 + 4 渐变 + 4 花纹），实现只有 6 张图片背景（`client/src/config/themes.js`）；`README.md:48` 称"身份验证码（匹配后弹窗显示专属祝福语，可选）"，而 `server/routes/entries.js` 对 `identity_code` 不做任何校验，任意字符串均可入库。

---

## 五、修复优先级建议

1. **先修问题 1 + 2 + 3**（同一根因）：把三处列映射统一成按列名映射的共享模块，`PUT` 改为动态字段更新 —— 这三步能让后台管理、Excel/JSON 导出、PDF 导出从"不可用/写坏数据"恢复为可用。
2. **再修问题 4 + 7 + 8 + 9**（安全与稳定性）：PDF HTML 转义、上传扩展名收口、`JWT_SECRET` 强校验 + 登录/身份码限流、落盘改临时文件+rename 并串行化。
3. **随后问题 5、6、10、11、12、17**（功能正确性）：可见性切换加 404、失败时清理上传文件、默认主题改 `img-1`、空库导出判空、PDF 分页与目录页码、迁移列序统一。
4. **最后问题 13-16、18-29**（一致性与体验）：服务端补长度与枚举校验、`site_open` 服务端校验、配置写入保留类型、删除条目时清理文件、错误信息脱敏、文档同步。

---

## 附：验证方式与可复现性

本次审查全部结论来自源码通读 + 隔离探针实测，**未修改项目内任何文件**。探针在临时目录复制了 `server/db/schema.sql`、`server/pdf/generator.js`、`server/pdf/templates/`，并使用真实的 `sql.js` / `multer` / `express` 依赖：

- 列映射复现：用真实 `.db` 跑 `rowToEntry`（`SELECT *`），分别验证"新库"与"迁移后老库"两种列序；
- PDF 复现：调用真实 `generatePdf()`，仅把 `puppeteer` 替换为捕获 `page.setContent()` 的空壳，直接检查送渲染 HTML 中的原始用户数据；
- 上传复现：用真实 multer 配置发起 multipart 请求，验证"目录不存在 500"、"`evil.html` 通过校验"、"超限 500"；
- 迁移复现：用早期列集建表后执行 `init.js` 的 `ALTER` 列表，打印迁移后的列顺序。

如需一份可直接运行的回归测试脚本（把上述 4 类探针固化为 `node --test` 用例），可以在此基础上补充。

