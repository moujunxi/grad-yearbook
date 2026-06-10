import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/init.js';

const SECRET = process.env.JWT_SECRET || '6f-classmates-secret';
const router = Router();

router.post('/login', async (req, res) => {
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
    const token = jwt.sign({ id, username: name }, SECRET, { expiresIn: '7d' });
    res.json({ token, username: name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
