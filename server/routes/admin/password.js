import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, persist } from '../../db/init.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const router = Router();

const changePasswordLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: '尝试过于频繁，请稍后再试',
});

// PUT /api/admin/password — 修改当前管理员密码（需已登录）
router.put('/', changePasswordLimiter, async (req, res) => {
  try {
    const { current_password: currentPassword, new_password: newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '请输入当前密码和新密码' });
    }
    if (String(newPassword).length < 6 || String(newPassword).length > 100) {
      return res.status(400).json({ error: '新密码长度需在 6-100 位之间' });
    }

    const db = await getDb();
    const stmt = db.prepare('SELECT id, password_hash FROM admin WHERE id = ?');
    stmt.bind([req.admin.id]);
    if (!stmt.step()) { stmt.free(); return res.status(404).json({ error: '管理员不存在' }); }
    const [id, hash] = stmt.get();
    stmt.free();

    if (!bcrypt.compareSync(String(currentPassword), hash)) {
      return res.status(401).json({ error: '当前密码不正确' });
    }

    const newHash = bcrypt.hashSync(String(newPassword), 10);
    db.run('UPDATE admin SET password_hash = ? WHERE id = ?', [newHash, id]);
    persist();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
