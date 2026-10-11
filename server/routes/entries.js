import { Router } from 'express';
import multer from 'multer';
import { join } from 'node:path';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getDb, persist } from '../db/init.js';
import { entrySchema, firstZodError } from '../validation/entry.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const UPLOAD_DIR = join(import.meta.dirname, '..', 'uploads');
// 启动时确保上传目录存在（否则首次上传 ENOENT 500）
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// 扩展名由服务端按 MIME 白名单决定，不信任客户端 originalname（防 x.html 存储型 XSS）
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_r, f, cb) => cb(null, randomUUID() + (MIME_EXT[f.mimetype] || '.jpg')),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => {
    if (MIME_EXT[f.mimetype]) return cb(null, true);
    cb(Object.assign(new Error('仅支持 JPG/PNG/GIF/WebP 图片'), { code: 'LIMIT_UNEXPECTED_FILE' }));
  },
});

function cleanupUploaded(file) {
  if (!file?.path) return;
  try { if (existsSync(file.path)) unlinkSync(file.path); } catch { /* ignore */ }
}

/** 安全解析客户端提交的 JSON 字段，失败返回 undefined 交由 zod 统一报错 */
function safeParse(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return undefined; }
}

const submitLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: '提交太频繁了，请稍后再试',
});

router.post('/', submitLimiter, upload.single('avatar'), async (req, res) => {
  try {
    const db = await getDb();

    // 收集截止校验（不再只依赖前端隐藏表单）
    const openRows = db.exec("SELECT value FROM site_config WHERE key = 'site_open'");
    const siteOpen = openRows[0]?.values?.[0]?.[0] ?? '1';
    if (siteOpen !== '1') {
      cleanupUploaded(req.file);
      return res.status(403).json({ error: '填写已截止，无法提交' });
    }

    const b = req.body || {};
    const candidate = {
      ...b,
      identity_code: String(b.identity_code ?? '').trim(),
      favorite_tags: safeParse(b.favorite_tags, []),
      custom_answers: safeParse(b.custom_answers, {}),
      personality_tags: safeParse(b.personality_tags, []),
    };
    const parsed = entrySchema.safeParse(candidate);
    if (!parsed.success) {
      cleanupUploaded(req.file);
      return res.status(400).json({ error: firstZodError(parsed.error) });
    }
    const data = parsed.data;

    // 身份验证码服务端校验：非空时必须存在于 identity_codes 表
    if (data.identity_code) {
      const stmt = db.prepare('SELECT 1 FROM identity_codes WHERE code = ?');
      stmt.bind([data.identity_code]);
      const valid = stmt.step();
      stmt.free();
      if (!valid) {
        cleanupUploaded(req.file);
        return res.status(400).json({ error: '身份验证码无效，请检查后重试' });
      }
    }

    const avatarPath = req.file ? `uploads/${req.file.filename}` : null;

    db.run(
      `INSERT INTO entries (name,nickname,gender,class_name,birthday,zodiac,avatar_path,wechat,qq,phone,email,favorite_color,favorite_book,favorite_movie,favorite_star,favorite_singer,favorite_song,favorite_food,dream_place,future,first_meeting,personality_tags,bio,motto,favorite_tags,custom_answers,label,bg_theme,signature,identity_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.name, data.nickname, data.gender, data.class_name, data.birthday, data.zodiac,
        avatarPath, data.wechat, data.qq, data.phone, data.email,
        data.favorite_color, data.favorite_book, data.favorite_movie, data.favorite_star,
        data.favorite_singer, data.favorite_song, data.favorite_food, data.dream_place,
        data.future, data.first_meeting,
        JSON.stringify(data.personality_tags),
        data.bio, data.motto,
        JSON.stringify(data.favorite_tags), JSON.stringify(data.custom_answers),
        data.label, data.bg_theme, data.signature, data.identity_code,
      ],
    );

    const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    const secret = (data.secret_message || '').trim();
    if (secret) {
      db.run('INSERT INTO secret_messages (entry_id, content) VALUES (?, ?)', [id, secret]);
    }
    persist();

    res.status(201).json({
      id, name: data.name, nickname: data.nickname,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    cleanupUploaded(req.file);
    console.error(e);
    res.status(500).json({ error: '提交失败，请重试' });
  }
});

export default router;
