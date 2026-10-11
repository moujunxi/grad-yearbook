import { Router } from 'express';
import { getDb } from '../db/init.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const lookupLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: '查询过于频繁，请稍后再试',
});

// GET /api/identity/lookup?code=xxx → { valid, blessing_message? }
router.get('/lookup', lookupLimiter, async (req, res) => {
  try {
    const code = (req.query.code || '').trim();
    if (!code) return res.status(400).json({ error: '缺少 code 参数' });
    if (code.length > 50) return res.json({ valid: false });
    const db = await getDb();
    const stmt = db.prepare('SELECT blessing_message FROM identity_codes WHERE code = ?');
    stmt.bind([code]);
    if (stmt.step()) {
      const [blessing_message] = stmt.get();
      stmt.free();
      return res.json({ valid: true, blessing_message });
    }
    stmt.free();
    res.json({ valid: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
