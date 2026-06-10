import { Router } from 'express';
import { getDb, persist } from '../../db/init.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec('SELECT key, value FROM site_config');
    const cfg = {};
    (rows[0]?.values || []).forEach(([k, v]) => { cfg[k] = v; });
    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', async (req, res) => {
  try {
    const db = await getDb();
    for (const [k, v] of Object.entries(req.body)) {
      const s = db.prepare('SELECT key FROM site_config WHERE key = ?');
      s.bind([k]); const exists = s.step(); s.free();
      if (exists) db.run('UPDATE site_config SET value = ? WHERE key = ?', [String(v), k]);
      else db.run('INSERT INTO site_config (key, value) VALUES (?, ?)', [k, String(v)]);
    }
    persist();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
