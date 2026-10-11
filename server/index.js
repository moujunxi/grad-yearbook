import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { join, dirname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/init.js';
import { verifyToken, getJwtSecret } from './middleware/auth.js';
import healthRouter from './routes/health.js';
import configRouter from './routes/config.js';
import entriesRouter from './routes/entries.js';
import authRouter from './routes/auth.js';
import adminEntries from './routes/admin/entries.js';
import adminStats from './routes/admin/stats.js';
import adminQrcode from './routes/admin/qrcode.js';
import adminExport from './routes/admin/export.js';
import adminPdf from './routes/admin/pdf.js';
import adminConfig from './routes/admin/config.js';
import adminPassword from './routes/admin/password.js';
import identityRouter from './routes/identity.js';
import adminIdentityCodes from './routes/admin/identity_codes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Increase timeout for PDF generation (default 30s is too short)
app.use((req, res, next) => {
  req.setTimeout(180000); // 3 min
  res.setTimeout(180000); // 3 min
  next();
});

await getDb();

// 启动时校验 JWT_SECRET（生产环境缺失/过短直接退出）
getJwtSecret();

// 确保上传目录存在（首次上传不再 ENOENT）
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// CORS：默认仅放行同源/本地开发源，可通过 CORS_ORIGIN 追加站点域名
const extraOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // 同源请求 / curl
    let allowed = false;
    try {
      const host = new URL(origin).hostname;
      allowed = host === 'localhost' || host === '127.0.0.1'
        || extraOrigins.includes(origin) || extraOrigins.includes(host);
    } catch { allowed = false; }
    callback(null, allowed);
  },
}));
app.use(express.json({ limit: '5mb' })); // 签名图为 dataURL，放宽到 5mb
app.use('/uploads', express.static(uploadsDir, {
  setHeaders(res) {
    // 防止上传文件被 MIME 嗅探执行（配合服务端固定扩展名）
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
  },
}));

// 公开
app.use('/api/health', healthRouter);
app.use('/api/config', configRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/identity', identityRouter);
app.use('/api/admin', authRouter);

// 管理员鉴权
app.use('/api/admin', verifyToken);
app.use('/api/admin/entries', adminEntries);
app.use('/api/admin/stats', adminStats);
app.use('/api/admin/qrcode', adminQrcode);
app.use('/api/admin/export/pdf', adminPdf);
app.use('/api/admin/export', adminExport);
app.use('/api/admin/config', adminConfig);
app.use('/api/admin/password', adminPassword);
app.use('/api/admin/identity-codes', adminIdentityCodes);

// 统一错误处理（multer 上传错误 + 未知错误，不外泄内部细节）
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '图片不能超过 5MB' });
  }
  if (err instanceof multer.MulterError || err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: err.message || '上传失败' });
  }
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
