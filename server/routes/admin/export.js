import { Router } from 'express';
import ExcelJS from 'exceljs';
import { getDb } from '../../db/init.js';

const router = Router();

function getEntries(db) {
  const rows = db.exec('SELECT * FROM entries ORDER BY created_at DESC');
  return (rows[0]?.values || []).map(r => ({
    id: r[0], name: r[1], gender: r[2], class_name: r[3], avatar_path: r[4],
    wechat: r[5], qq: r[6], phone: r[7], email: r[8], bio: r[9], motto: r[10],
    future: r[11], favorite_tags: JSON.parse(r[12]||'[]'), custom_answers: JSON.parse(r[13]||'{}'),
    label: r[14], bg_theme: r[15], signature: r[16], identity_code: r[17],
    is_visible: r[18], created_at: r[19],
    nickname: r[20], birthday: r[21], zodiac: r[22],
    favorite_color: r[23], favorite_book: r[24], favorite_movie: r[25],
    favorite_star: r[26], favorite_singer: r[27], favorite_song: r[28],
    favorite_food: r[29], dream_place: r[30], first_meeting: r[31],
    personality_tags: JSON.parse(r[32]||'[]'),
  }));
}

// JSON 导出（含私密留言）
router.get('/json', async (_req, res) => {
  try {
    const db = await getDb();
    const entries = getEntries(db);
    const msgs = db.exec('SELECT entry_id, content FROM secret_messages WHERE content != ""');
    const msgMap = {};
    (msgs[0]?.values || []).forEach(([eid, c]) => {
      if (!msgMap[eid]) msgMap[eid] = []; msgMap[eid].push(c);
    });
    const result = entries.map(e => ({ ...e, secret_messages: msgMap[e.id] || [] }));
    res.set('Content-Disposition', 'attachment; filename=entries.json');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Excel 导出（不含私密留言）
router.get('/excel', async (_req, res) => {
  try {
    const db = await getDb();
    const entries = getEntries(db);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('同学录');
    ws.columns = [
      { header: 'ID', key: 'id' }, { header: '姓名', key: 'name' }, { header: '昵称', key: 'nickname' },
      { header: '性别', key: 'gender' }, { header: '班级', key: 'class_name' },
      { header: '生日', key: 'birthday' }, { header: '星座', key: 'zodiac' },
      { header: '微信', key: 'wechat' }, { header: 'QQ', key: 'qq' },
      { header: '手机', key: 'phone' }, { header: '邮箱', key: 'email' },
      { header: '喜欢的颜色', key: 'favorite_color' }, { header: '喜欢的书籍', key: 'favorite_book' },
      { header: '喜欢的电影', key: 'favorite_movie' }, { header: '喜欢的明星', key: 'favorite_star' },
      { header: '喜欢的歌手', key: 'favorite_singer' }, { header: '喜欢的歌曲', key: 'favorite_song' },
      { header: '爱吃的食物', key: 'favorite_food' }, { header: '想去的地方', key: 'dream_place' },
      { header: '梦想', key: 'future' }, { header: '第一次见面', key: 'first_meeting' },
      { header: '性格标签', key: 'personality_tags' },
      { header: '可见', key: 'is_visible' }, { header: '时间', key: 'created_at' },
    ];
    entries.forEach(e => ws.addRow(e));
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename=entries.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
