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
    const avatarPath = req.file ? `uploads/${req.file.filename}` : null;

    db.run(
      `INSERT INTO entries (name,gender,class_name,avatar_path,wechat,qq,phone,email,bio,motto,future,favorite_tags,custom_answers,label,bg_theme)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.name||'', b.gender||'', b.class_name||'', avatarPath, b.wechat||'', b.qq||'', b.phone||'',
       b.email||'', b.bio||'', b.motto||'', b.future||'',
       JSON.stringify(b.favorite_tags), JSON.stringify(b.custom_answers),
       b.label||'', b.bg_theme||'solid-indigo']
    );

    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    db.run("INSERT INTO secret_messages (entry_id, content) VALUES (?, '')", [id]);
    persist();

    res.status(201).json({
      id, name: b.name, gender: b.gender||'', class_name: b.class_name||'',
      avatar_path: avatarPath, wechat: b.wechat||'', qq: b.qq||'', phone: b.phone||'',
      email: b.email||'', bio: b.bio||'', motto: b.motto||'', future: b.future||'',
      favorite_tags: b.favorite_tags, custom_answers: b.custom_answers,
      label: b.label||'', bg_theme: b.bg_theme||'solid-indigo',
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '提交失败，请重试' });
  }
});

export default router;
