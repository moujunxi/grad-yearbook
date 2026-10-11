import { Router } from 'express';
import ExcelJS from 'exceljs';
import { getDb } from '../../db/init.js';
import { entriesFromExec } from '../../db/entries.js';

const router = Router();

function getEntries(db) {
  return entriesFromExec(db.exec('SELECT * FROM entries ORDER BY created_at DESC'));
}

// JSON 导出（含私密留言）
router.get('/json', async (_req, res) => {
  try {
    const db = await getDb();
    const entries = getEntries(db);
    const msgs = db.exec('SELECT entry_id, content FROM secret_messages WHERE content != ""');
    const msgMap = {};
    (msgs[0]?.values || []).forEach(([eid, c]) => {
      if (!msgMap[eid]) msgMap[eid] = [];
      msgMap[eid].push(c);
    });
    const result = entries.map((e) => ({ ...e, secret_messages: msgMap[e.id] || [] }));
    res.set('Content-Disposition', 'attachment; filename=entries.json');
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 数组/对象字段在 Excel 中以 JSON 文本呈现，避免 toString 变成 "a,b"
const asCell = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
};

// Excel 导出（不含私密留言）
router.get('/excel', async (_req, res) => {
  try {
    const db = await getDb();
    const entries = getEntries(db);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('同学录');
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '昵称', key: 'nickname', width: 12 },
      { header: '性别', key: 'gender', width: 6 },
      { header: '班级', key: 'class_name', width: 12 },
      { header: '生日', key: 'birthday', width: 14 },
      { header: '星座', key: 'zodiac', width: 10 },
      { header: '微信', key: 'wechat', width: 16 },
      { header: 'QQ', key: 'qq', width: 14 },
      { header: '手机', key: 'phone', width: 16 },
      { header: '邮箱', key: 'email', width: 22 },
      { header: '一句话介绍', key: 'bio', width: 24 },
      { header: '座右铭', key: 'motto', width: 20 },
      { header: '喜欢的颜色', key: 'favorite_color', width: 12 },
      { header: '喜欢的书籍', key: 'favorite_book', width: 16 },
      { header: '喜欢的电影', key: 'favorite_movie', width: 16 },
      { header: '喜欢的明星', key: 'favorite_star', width: 14 },
      { header: '喜欢的歌手', key: 'favorite_singer', width: 14 },
      { header: '喜欢的歌曲', key: 'favorite_song', width: 16 },
      { header: '爱吃的食物', key: 'favorite_food', width: 16 },
      { header: '想去的地方', key: 'dream_place', width: 16 },
      { header: '梦想', key: 'future', width: 28 },
      { header: '第一次见面', key: 'first_meeting', width: 28 },
      { header: '兴趣标签', key: 'favorite_tags', width: 24 },
      { header: '性格标签', key: 'personality_tags', width: 24 },
      { header: '个性标签', key: 'label', width: 12 },
      { header: '自定义问答', key: 'custom_answers', width: 30 },
      { header: '背景主题', key: 'bg_theme', width: 10 },
      { header: '身份码', key: 'identity_code', width: 14 },
      { header: '签名', key: 'signature', width: 16 },
      { header: '可见', key: 'is_visible', width: 8 },
      { header: '提交时间', key: 'created_at', width: 20 },
    ];
    entries.forEach((e) => {
      ws.addRow({
        ...e,
        signature: e.signature ? '已签名' : '',
        favorite_tags: asCell(e.favorite_tags),
        personality_tags: asCell(e.personality_tags),
        custom_answers: asCell(e.custom_answers),
      });
    });
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename=entries.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
