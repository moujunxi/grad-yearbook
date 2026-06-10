import { Router } from 'express';
import { getDb } from '../../db/init.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const total = db.exec("SELECT COUNT(*) FROM entries")[0].values[0][0];
    const daily = db.exec("SELECT date(created_at) AS day, COUNT(*) AS cnt FROM entries GROUP BY day ORDER BY day");
    const trend = (daily[0]?.values || []).map(([d, c]) => ({ date: d, count: c }));
    res.json({ total, trend });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
