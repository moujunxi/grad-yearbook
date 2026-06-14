import { Router } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

// GET /api/identity/lookup?code=xxx → { valid, blessing_message? }
router.get('/lookup', async (req, res) => {
  try {
    const code = (req.query.code || '').trim();
    if (!code) return res.status(400).json({ error: '缺少 code 参数' });
    const db = await getDb();
    const stmt = db.prepare("SELECT blessing_message FROM identity_codes WHERE code = ?");
    stmt.bind([code]);
    if (stmt.step()) {
      const [blessing_message] = stmt.get();
      stmt.free();
      return res.json({ valid: true, blessing_message });
    }
    stmt.free();
    res.json({ valid: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
