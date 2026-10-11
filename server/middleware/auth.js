import jwt from 'jsonwebtoken';

const DEV_FALLBACK_SECRET = '6f-classmates-secret';
let warned = false;

/**
 * 统一的 JWT 密钥获取：
 * - 生产环境（NODE_ENV=production）必须配置 >=32 位的 JWT_SECRET，否则拒绝启动；
 * - 开发环境缺失时回退默认值并打印安全警告。
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[fatal] 生产环境必须设置长度 >= 32 的 JWT_SECRET 环境变量，拒绝启动。');
  }
  if (!warned) {
    warned = true;
    console.warn('[security] JWT_SECRET 未设置或长度不足 32，正在使用开发默认值。生产环境请务必配置！');
  }
  return DEV_FALLBACK_SECRET;
}

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    req.admin = jwt.verify(header.slice(7), getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}
