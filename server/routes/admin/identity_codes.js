import { Router } from 'express';
import { getDb, persist } from '../../db/init.js';

const router = Router();

// GET /api/admin/identity-codes — 列出全部
router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec("SELECT id, code, blessing_message, created_at FROM identity_codes ORDER BY created_at DESC");
    res.json((rows[0]?.values || []).map(r => ({
      id: r[0], code: r[1], blessing_message: r[2], created_at: r[3],
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/identity-codes — 新增
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { code, blessing_message } = req.body;
    if (!code?.trim() || !blessing_message?.trim()) {
      return res.status(400).json({ error: '验证码和祝福语不能为空' });
    }
    db.run("INSERT INTO identity_codes (code, blessing_message) VALUES (?, ?)",
      [code.trim(), blessing_message.trim()]);
    persist();
    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    res.status(201).json({ id, code: code.trim(), blessing_message: blessing_message.trim() });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: '该验证码已存在' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/identity-codes/:id — 更新
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { code, blessing_message } = req.body;
    db.run("UPDATE identity_codes SET code=?, blessing_message=? WHERE id=?",
      [code?.trim()||'', blessing_message?.trim()||'', +req.params.id]);
    persist();
    res.json({ ok: true });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: '该验证码已存在' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/identity-codes/:id — 删除
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run("DELETE FROM identity_codes WHERE id = ?", [+req.params.id]);
    persist();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
