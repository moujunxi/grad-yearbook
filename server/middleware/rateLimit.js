/**
 * 极简固定窗口限流（内存实现，无需额外依赖）。
 * 用于登录、身份码查询、条目提交等无认证的公开接口。
 */

const buckets = new Map();

// 定期清理过期桶，避免内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.start > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimit({ windowMs = 60_000, max = 10, message = '请求过于频繁，请稍后再试' } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}
