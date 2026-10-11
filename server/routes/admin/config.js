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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 序列化规则：对象/数组 → JSON 字符串；其余（含字符串）原样存储，避免 String() 破坏类型
function serializeValue(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

router.put('/', async (req, res) => {
  try {
    const db = await getDb();
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: '请求体必须是对象' });
    }
    for (const [k, v] of Object.entries(req.body)) {
      if (typeof k !== 'string' || k.length > 100) continue;
      const value = serializeValue(v);
      if (value.length > 100_000) return res.status(400).json({ error: '配置内容过长' });
      const s = db.prepare('SELECT key FROM site_config WHERE key = ?');
      s.bind([k]);
      const exists = s.step();
      s.free();
      if (exists) db.run('UPDATE site_config SET value = ? WHERE key = ?', [value, k]);
      else db.run('INSERT INTO site_config (key, value) VALUES (?, ?)', [k, value]);
    }
    persist();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
