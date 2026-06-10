import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET || '6f-classmates-secret';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    req.admin = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}
