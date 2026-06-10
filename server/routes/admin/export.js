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
    label: r[14], bg_theme: r[15], is_visible: r[16], created_at: r[17],
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
      { header: 'ID', key: 'id' }, { header: '姓名', key: 'name' }, { header: '性别', key: 'gender' },
      { header: '班级', key: 'class_name' }, { header: '微信', key: 'wechat' }, { header: 'QQ', key: 'qq' },
      { header: '手机', key: 'phone' }, { header: '邮箱', key: 'email' }, { header: '介绍', key: 'bio' },
      { header: '座右铭', key: 'motto' }, { header: '未来', key: 'future' },
      { header: '标签', key: 'label' }, { header: '主题', key: 'bg_theme' },
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
