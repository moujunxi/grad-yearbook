import { Router } from 'express';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, persist } from '../../db/init.js';
import { fetchEntries, fetchEntryById } from '../../db/entries.js';
import {
  entrySchema, ENTRY_TEXT_COLUMNS, ENTRY_JSON_COLUMNS, firstZodError,
} from '../../validation/entry.js';

const router = Router();
const SERVER_ROOT = join(import.meta.dirname, '..', '..');

function internalError(res, e) {
  console.error(e);
  res.status(500).json({ error: '服务器内部错误' });
}

function removeAvatarFile(avatarPath) {
  if (!avatarPath || !avatarPath.startsWith('uploads/')) return;
  const p = join(SERVER_ROOT, avatarPath);
  if (existsSync(p)) {
    try { unlinkSync(p); } catch { /* 删除失败不阻断主流程 */ }
  }
}

// 列表（分页+搜索）
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const page = Math.max(1, +req.query.page || 1);
    const size = Math.min(100, Math.max(1, +req.query.size || 20));
    const search = req.query.search || '';
    const offset = (page - 1) * size;

    let where = '', params = [];
    if (search) { where = 'WHERE name LIKE ?'; params.push(`%${search}%`); }

    const cStmt = db.prepare(`SELECT COUNT(*) FROM entries ${where}`);
    if (params.length) cStmt.bind(params);
    cStmt.step();
    const total = cStmt.get()[0];
    cStmt.free();

    const rows = fetchEntries(db, { where, params, limit: size, offset });

    res.json({ total, page, size, rows });
  } catch (e) { internalError(res, e); }
});

// 单条详情 + 私密留言
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const entry = fetchEntryById(db, req.params.id);
    if (!entry) return res.status(404).json({ error: '未找到' });

    const s2 = db.prepare('SELECT id, content FROM secret_messages WHERE entry_id = ?');
    s2.bind([entry.id]);
    const msgs = [];
    while (s2.step()) { const [id, content] = s2.get(); msgs.push({ id, content }); }
    s2.free();

    res.json({ ...entry, secret_messages: msgs });
  } catch (e) { internalError(res, e); }
});

// 编辑：只更新请求中实际携带的字段（白名单），不再整体覆盖
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const id = +req.params.id;
    const existing = fetchEntryById(db, id);
    if (!existing) return res.status(404).json({ error: '条目不存在' });

    const writable = new Set([...ENTRY_TEXT_COLUMNS, ...ENTRY_JSON_COLUMNS]);
    const patch = {};
    for (const key of writable) {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key) && req.body[key] !== undefined) {
        patch[key] = req.body[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: '没有可更新的字段' });
    }

    const parsed = entrySchema.pick(Object.fromEntries(Object.keys(patch).map((k) => [k, true])))
      .partial()
      .safeParse(patch);
    if (!parsed.success) {
      return res.status(400).json({ error: firstZodError(parsed.error) });
    }

    const sets = [];
    const values = [];
    for (const [key, value] of Object.entries(parsed.data)) {
      sets.push(`${key} = ?`);
      values.push(ENTRY_JSON_COLUMNS.includes(key) ? JSON.stringify(value) : value);
    }
    values.push(id);
    db.run(`UPDATE entries SET ${sets.join(', ')} WHERE id = ?`, values);
    persist();
    res.json({ ok: true });
  } catch (e) { internalError(res, e); }
});

// 切换可见性
router.patch('/:id/visibility', async (req, res) => {
  try {
    const db = await getDb();
    const id = +req.params.id;
    const entry = fetchEntryById(db, id);
    if (!entry) return res.status(404).json({ error: '条目不存在' });

    const next = entry.is_visible ? 0 : 1;
    db.run('UPDATE entries SET is_visible = ? WHERE id = ?', [next, id]);
    persist();
    res.json({ is_visible: next });
  } catch (e) { internalError(res, e); }
});

// 删除（同时清理磁盘头像）
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const id = +req.params.id;
    const entry = fetchEntryById(db, id);
    if (!entry) return res.status(404).json({ error: '条目不存在' });

    db.run('DELETE FROM secret_messages WHERE entry_id = ?', [id]);
    db.run('DELETE FROM entries WHERE id = ?', [id]);
    persist();
    removeAvatarFile(entry.avatar_path);
    res.json({ ok: true });
  } catch (e) { internalError(res, e); }
});

export default router;
