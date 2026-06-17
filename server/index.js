import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/init.js';
import { verifyToken } from './middleware/auth.js';
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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

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
app.use('/api/admin/identity-codes', adminIdentityCodes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
