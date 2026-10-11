/**
 * entries 表共享访问层：按列名映射（而非手写下标），
 * 供 admin/导出/PDF 三处复用，避免列序错位。
 */

export const THEME_KEYS = ['img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6'];
export const DEFAULT_THEME = 'img-1';

/** 安全解析 JSON 字段，坏数据回退默认值而不是抛错 */
export function parseJsonSafe(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** 把一行（列名 -> 值）转换为 entry 对象，JSON 字段统一解析为数组/对象 */
export function mapEntryRow(row) {
  const e = { ...row };
  e.favorite_tags = toArray(parseJsonSafe(e.favorite_tags, []));
  e.custom_answers = toObject(parseJsonSafe(e.custom_answers, {}));
  e.personality_tags = toArray(parseJsonSafe(e.personality_tags, []));
  e.is_visible = e.is_visible == null ? 1 : Number(e.is_visible);
  if (!THEME_KEYS.includes(e.bg_theme)) e.bg_theme = DEFAULT_THEME;
  return e;
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return typeof v === 'string' ? [v] : [];
}

function toObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/** 查询条目列表（支持 where/params/limit/offset），返回已映射的 entry 数组 */
export function fetchEntries(db, { where = '', params = [], orderBy = 'created_at DESC', limit, offset } = {}) {
  let sql = `SELECT * FROM entries ${where} ORDER BY ${orderBy}`;
  const bindParams = [...params];
  if (limit != null) {
    sql += ' LIMIT ?';
    bindParams.push(limit);
    if (offset != null) { sql += ' OFFSET ?'; bindParams.push(offset); }
  }
  const stmt = db.prepare(sql);
  if (bindParams.length) stmt.bind(bindParams);
  const rows = [];
  while (stmt.step()) rows.push(mapEntryRow(stmt.getAsObject()));
  stmt.free();
  return rows;
}

/** 按 id 查询单条，不存在返回 null */
export function fetchEntryById(db, id) {
  const stmt = db.prepare('SELECT * FROM entries WHERE id = ?');
  stmt.bind([Number(id)]);
  if (!stmt.step()) { stmt.free(); return null; }
  const entry = mapEntryRow(stmt.getAsObject());
  stmt.free();
  return entry;
}

/** 把 db.exec() 的结果（[{columns, values}]）映射为 entry 数组 */
export function entriesFromExec(result) {
  const rs = Array.isArray(result) ? result[0] : null;
  if (!rs || !rs.columns) return [];
  return rs.values.map((values) => {
    const row = {};
    rs.columns.forEach((c, i) => { row[c] = values[i]; });
    return mapEntryRow(row);
  });
}
