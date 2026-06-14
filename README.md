# 🎓 6F 同学录

初中毕业电子同学录 — 同学扫码填写个人信息、选择背景主题、留下私密留言，管理员审核后一键导出精美 PDF。适配手机端（含微信内置浏览器）。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite 5 + TailwindCSS 3 |
| 后端 | Node.js + Express 4 |
| 数据库 | SQLite（sql.js，纯 WASM，零原生依赖） |
| 鉴权 | JWT（jsonwebtoken + bcryptjs） |
| PDF | Puppeteer（无头 Chromium 渲染） |
| 图表 | recharts |
| 导出 | exceljs |
| 包管理 | pnpm monorepo |

## 目录结构

```
├── client/                  # React 前端
│   └── src/
│       ├── pages/           # FormPage, ThankYouPage
│       │   └── admin/       # 管理后台页面
│       ├── components/      # AvatarUpload, ThemeSelector, TagSelector, EntryCard, SignaturePad, IdentityCodeInput
│       ├── config/          # themes.js（12款）, tags.js
│       ├── schemas/         # Zod 表单校验
│       └── utils/           # Axios 实例 + JWT 拦截器
├── server/                  # Express 后端
│   ├── db/                  # SQLite 初始化 + Schema
│   ├── routes/              # API 路由（公开 + 管理后台）
│   ├── middleware/           # JWT 鉴权中间件
│   ├── pdf/                 # Puppeteer PDF 生成 + HTML 模板
│   └── uploads/             # 头像上传目录
├── pnpm-workspace.yaml
└── package.json
```

## 功能

**同学端**
- 填写个人信息（姓名、联系方式、介绍、格言、未来梦想）
- 上传头像（JPG/PNG/GIF/WebP，≤5MB）
- 选择背景主题（12款：4纯色 + 4渐变 + 4花纹）
- 兴趣标签多选 + 个性标签单选
- 自定义问答（管理员后台配置题目）
- 手写签名（Canvas 绘制，可选）
- 身份验证码（匹配后弹窗显示专属祝福语，可选）
- 提交后预览卡片

**管理后台**
- JWT 登录鉴权
- 统计概览 + 每日提交趋势折线图
- 条目管理：查看、编辑、隐藏/显示、删除
- 查看私密留言
- 手写签名查看（详情页展示签名图）
- 身份验证码管理（添加/编辑/删除，每个码绑定一条祝福语）
- 网站开关（关闭后前端显示"已截止"）
- 自定义问答题目配置
- 填写入口二维码生成与下载
- 数据导出：JSON（含私密留言）、Excel、PDF

**PDF 同学录**
- 封面页 + 目录页 + 每位同学独立一页（含背景主题、手写签名）+ 私密留言汇总
- 头像、签名以 base64 内嵌，无破图
- 一键下载

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境（前端 :5173 + 后端 :3000）
pnpm dev
```

打开 http://localhost:5173 访问填写页，http://localhost:5173/admin/login 进入后台。

**默认管理员**：`admin` / `admin123`

> 首次启动时自动创建管理员账号，密码存储为 bcrypt 哈希。

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `PORT` | 后端端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥 | `6f-classmates-secret` |

---

## 1Panel 部署到阿里云

### 前置条件

- 阿里云 ECS（建议 2 核 4G 以上，PDF 生成需 Chromium）
- 已安装 [1Panel](https://1panel.cn) 面板
- 域名已解析到服务器 IP（可选，也可用 IP + 端口）

### 1. 安装 Node.js 和 pnpm

在 1Panel → **工具箱** → **运行环境** 中安装 Node.js 20+。然后 SSH 到服务器安装 pnpm：

```bash
npm install -g pnpm
```

### 2. 上传项目

将项目推送到 Git 仓库，然后在服务器上克隆：

```bash
git clone https://github.com/moujunxi/grad-yearbook.git /opt/grad-yearbook
cd /opt/grad-yearbook
pnpm install
```

### 3. 构建前端

```bash
cd client
pnpm build
# 产出在 client/dist/
```

### 4. 在 1Panel 中创建网站

进入 **网站** → **创建网站** → **静态网站**：

- **域名**：填写你的域名或服务器 IP
- **网站目录**：选择 `/opt/grad-yearbook/client/dist`
- **代理设置**：添加以下两条反向代理

| 路径 | 目标 |
|---|---|
| `/api` | `http://127.0.0.1:3000` |
| `/uploads` | `http://127.0.0.1:3000` |

### 5. 用 PM2 运行后端

在 1Panel → **工具箱** → **进程守护** 中创建守护进程：

- **名称**：`6f-classmates-server`
- **启动命令**：`node index.js`
- **工作目录**：`/opt/grad-yearbook/server`
- **进程数**：1

启动后后端即运行在 `http://127.0.0.1:3000`。

### 6. 安全配置（可选）

在 1Panel → **网站** → **BasicAuth** 中为 `/admin` 路径添加额外密码保护，或在后端添加 IP 白名单。

### 7. 防火墙放行

阿里云安全组和 1Panel 防火墙都需要放行 80/443 端口。

### 更新部署

```bash
cd /opt/grad-yearbook
git pull
pnpm install
cd client && pnpm build
# 在 1Panel 进程守护中重启 server 进程
```

---

## License

MIT
