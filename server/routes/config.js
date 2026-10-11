import { Router } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

router.get('/questions', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec("SELECT value FROM site_config WHERE key = 'custom_questions'");
    const raw = rows[0]?.values?.[0]?.[0] || '[]';
    let questions;
    try {
      questions = JSON.parse(raw);
      if (!Array.isArray(questions)) questions = [];
    } catch {
      // 兼容历史坏数据（如被 String() 写成 "a,b,c"）
      questions = typeof raw === 'string' && raw.trim()
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }
    res.json(questions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/site_open', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec("SELECT value FROM site_config WHERE key = 'site_open'");
    const open = rows[0]?.values?.[0]?.[0] || '1';
    res.json({ open: open === '1' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
