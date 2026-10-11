import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/init.js';
import { getJwtSecret } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: '登录尝试过于频繁，请 1 分钟后再试',
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

    const db = await getDb();
    const stmt = db.prepare('SELECT id, username, password_hash FROM admin WHERE username = ?');
    stmt.bind([username]);
    if (!stmt.step()) { stmt.free(); return res.status(401).json({ error: '用户名或密码错误' }); }
    const [id, name, hash] = stmt.get();
    stmt.free();

    if (!bcrypt.compareSync(password, hash)) return res.status(401).json({ error: '用户名或密码错误' });
    const token = jwt.sign({ id, username: name }, getJwtSecret(), { expiresIn: '7d' });
    res.json({ token, username: name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
