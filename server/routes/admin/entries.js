import { Router } from 'express';
import { getDb, persist } from '../../db/init.js';

const router = Router();

function rowToEntry(r) {
  return { id: r[0], name: r[1], gender: r[2], class_name: r[3], avatar_path: r[4],
    wechat: r[5], qq: r[6], phone: r[7], email: r[8], bio: r[9], motto: r[10],
    future: r[11], favorite_tags: JSON.parse(r[12]||'[]'), custom_answers: JSON.parse(r[13]||'{}'),
    label: r[14], bg_theme: r[15], signature: r[16], identity_code: r[17],
    is_visible: r[18], created_at: r[19],
    nickname: r[20], birthday: r[21], zodiac: r[22],
    favorite_color: r[23], favorite_book: r[24], favorite_movie: r[25],
    favorite_star: r[26], favorite_singer: r[27], favorite_song: r[28],
    favorite_food: r[29], dream_place: r[30], first_meeting: r[31],
    personality_tags: JSON.parse(r[32]||'[]'),
  };
}

// 列表（分页+搜索）
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const page = +req.query.page || 1, size = +req.query.size || 20, search = req.query.search || '';
    const offset = (page - 1) * size;

    let where = '', params = [];
    if (search) { where = "WHERE name LIKE ?"; params.push(`%${search}%`); }

    const countSql = `SELECT COUNT(*) FROM entries ${where}`;
    const cStmt = db.prepare(countSql);
    if (params.length) cStmt.bind(params);
    cStmt.step(); const total = cStmt.get()[0]; cStmt.free();

    const sql = `SELECT * FROM entries ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const stmt = db.prepare(sql);
    stmt.bind([...params, size, offset]);
    const rows = [];
    while (stmt.step()) rows.push(rowToEntry(stmt.get()));
    stmt.free();

    res.json({ total, page, size, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 单条详情 + 私密留言
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const s1 = db.prepare('SELECT * FROM entries WHERE id = ?');
    s1.bind([+req.params.id]);
    if (!s1.step()) { s1.free(); return res.status(404).json({ error: '未找到' }); }
    const entry = rowToEntry(s1.get()); s1.free();

    const s2 = db.prepare('SELECT id, content FROM secret_messages WHERE entry_id = ?');
    s2.bind([entry.id]);
    const msgs = [];
    while (s2.step()) { const [id, content] = s2.get(); msgs.push({ id, content }); }
    s2.free();

    res.json({ ...entry, secret_messages: msgs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 编辑
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const b = req.body;
    db.run(`UPDATE entries SET name=?,nickname=?,gender=?,class_name=?,birthday=?,zodiac=?,
      wechat=?,qq=?,phone=?,email=?,favorite_color=?,favorite_book=?,favorite_movie=?,favorite_star=?,
      favorite_singer=?,favorite_song=?,favorite_food=?,dream_place=?,future=?,first_meeting=?,
      personality_tags=?,bio=?,motto=?,favorite_tags=?,custom_answers=?,label=?,bg_theme=?,
      signature=?,identity_code=? WHERE id=?`,
      [b.name||'', b.nickname||'', b.gender||'', b.class_name||'', b.birthday||'', b.zodiac||'',
       b.wechat||'', b.qq||'', b.phone||'', b.email||'',
       b.favorite_color||'', b.favorite_book||'', b.favorite_movie||'', b.favorite_star||'',
       b.favorite_singer||'', b.favorite_song||'', b.favorite_food||'', b.dream_place||'',
       b.future||'', b.first_meeting||'',
       JSON.stringify(b.personality_tags||[]),
       b.bio||'', b.motto||'',
       JSON.stringify(b.favorite_tags||[]), JSON.stringify(b.custom_answers||{}),
       b.label||'', b.bg_theme||'pattern-dots', (b.signature||''), (b.identity_code||''), +req.params.id]);
    persist();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 切换可见性
router.patch('/:id/visibility', async (req, res) => {
  try {
    const db = await getDb();
    const s = db.prepare('SELECT is_visible FROM entries WHERE id = ?');
    s.bind([+req.params.id]);
    s.step(); const v = s.get()[0]; s.free();
    db.run('UPDATE entries SET is_visible = ? WHERE id = ?', [v ? 0 : 1, +req.params.id]);
    persist();
    res.json({ is_visible: v ? 0 : 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM secret_messages WHERE entry_id = ?', [+req.params.id]);
    db.run('DELETE FROM entries WHERE id = ?', [+req.params.id]);
    persist();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
