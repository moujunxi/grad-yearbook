import { Router } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDb, persist } from '../db/init.js';

const router = Router();

const storage = multer.diskStorage({
  destination: join(import.meta.dirname, '..', 'uploads'),
  filename: (_r, f, cb) => cb(null, randomUUID() + extname(f.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) =>
    cb(null, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.mimetype)),
});

router.post('/', upload.single('avatar'), async (req, res) => {
  try {
    const db = await getDb();
    const b = req.body;
    b.favorite_tags = b.favorite_tags ? JSON.parse(b.favorite_tags) : [];
    b.custom_answers = b.custom_answers ? JSON.parse(b.custom_answers) : {};
    b.personality_tags = b.personality_tags ? JSON.parse(b.personality_tags) : [];
    const avatarPath = req.file ? `uploads/${req.file.filename}` : null;

    const signatureData = (b.signature || '').trim();
    const identityCode = (b.identity_code || '').trim();

    db.run(
      `INSERT INTO entries (name,nickname,gender,class_name,birthday,zodiac,avatar_path,wechat,qq,phone,email,favorite_color,favorite_book,favorite_movie,favorite_star,favorite_singer,favorite_song,favorite_food,dream_place,future,first_meeting,personality_tags,bio,motto,favorite_tags,custom_answers,label,bg_theme,signature,identity_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.name||'', b.nickname||'', b.gender||'', b.class_name||'', b.birthday||'', b.zodiac||'',
       avatarPath, b.wechat||'', b.qq||'', b.phone||'', b.email||'',
       b.favorite_color||'', b.favorite_book||'', b.favorite_movie||'', b.favorite_star||'',
       b.favorite_singer||'', b.favorite_song||'', b.favorite_food||'', b.dream_place||'',
       b.future||'', b.first_meeting||'',
       JSON.stringify(b.personality_tags),
       b.bio||'', b.motto||'',
       JSON.stringify(b.favorite_tags), JSON.stringify(b.custom_answers),
       b.label||'', b.bg_theme||'pattern-dots', signatureData, identityCode]
    );

    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    const secret = (b.secret_message || '').trim();
    db.run("INSERT INTO secret_messages (entry_id, content) VALUES (?, ?)", [id, secret]);
    persist();

    res.status(201).json({
      id, name: b.name, nickname: b.nickname||'',
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '提交失败，请重试' });
  }
});

export default router;
