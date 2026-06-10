import { Router } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

router.get('/questions', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec("SELECT value FROM site_config WHERE key = 'custom_questions'");
    const raw = rows[0]?.values?.[0]?.[0] || '[]';
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/site_open', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec("SELECT value FROM site_config WHERE key = 'site_open'");
    const open = rows[0]?.values?.[0]?.[0] || '1';
    res.json({ open: open === '1' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
