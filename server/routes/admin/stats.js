import { Router } from 'express';
import { getDb } from '../../db/init.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const total = db.exec('SELECT COUNT(*) FROM entries')[0].values[0][0];
    // 排除 created_at 为空或非法日期的异常数据
    const daily = db.exec(
      `SELECT date(created_at) AS day, COUNT(*) AS cnt FROM entries
       WHERE created_at IS NOT NULL AND created_at != '' AND date(created_at) IS NOT NULL
       GROUP BY day ORDER BY day`,
    );
    const trend = (daily[0]?.values || []).map(([d, c]) => ({ date: d, count: c }));
    res.json({ total, trend });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
