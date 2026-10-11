import { z } from 'zod';
import { THEME_KEYS, DEFAULT_THEME } from '../db/entries.js';

const str = (max) => z.string().max(max, `最多 ${max} 字`);

/**
 * 服务端条目字段校验（与 client/src/schemas/entrySchema.js 保持一致的上限），
 * POST 用完整解析，PUT 用 partial + pick 做动态子集校验。
 */
export const entrySchema = z.object({
  name: z.string().trim().min(1, '姓名不能为空').max(50, '姓名最多50字'),
  nickname: str(50).optional().default(''),
  gender: str(4).optional().default(''),
  class_name: str(50).optional().default(''),
  birthday: str(20).optional().default(''),
  zodiac: str(10).optional().default(''),
  wechat: str(100).optional().default(''),
  qq: str(50).optional().default(''),
  phone: str(30).optional().default(''),
  email: str(100).optional().default('')
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), '邮箱格式不正确'),
  favorite_color: str(50).optional().default(''),
  favorite_book: str(100).optional().default(''),
  favorite_movie: str(100).optional().default(''),
  favorite_star: str(50).optional().default(''),
  favorite_singer: str(100).optional().default(''),
  favorite_song: str(100).optional().default(''),
  favorite_food: str(100).optional().default(''),
  dream_place: str(100).optional().default(''),
  future: str(500).optional().default(''),
  first_meeting: str(500).optional().default(''),
  bio: str(500).optional().default(''),
  motto: str(200).optional().default(''),
  label: str(50).optional().default(''),
  bg_theme: z.string().refine((v) => THEME_KEYS.includes(v), '背景主题无效')
    .optional().default(DEFAULT_THEME),
  personality_tags: z.array(str(50)).max(20, '性格标签最多20个').optional().default([]),
  favorite_tags: z.array(str(50)).max(30, '兴趣标签最多30个').optional().default([]),
  custom_answers: z.record(str(300), str(1000)).optional().default({}),
  signature: z.string().max(600_000, '签名图过大').optional().default(''),
  identity_code: str(50).optional().default(''),
  secret_message: str(1000).optional().default(''),
});

/** entries 表中可由编辑接口更新的纯文本列 */
export const ENTRY_TEXT_COLUMNS = [
  'name', 'nickname', 'gender', 'class_name', 'birthday', 'zodiac',
  'wechat', 'qq', 'phone', 'email', 'favorite_color', 'favorite_book',
  'favorite_movie', 'favorite_star', 'favorite_singer', 'favorite_song',
  'favorite_food', 'dream_place', 'future', 'first_meeting', 'bio', 'motto',
  'label', 'bg_theme', 'signature', 'identity_code',
];

/** entries 表中以 JSON 字符串存储的列 */
export const ENTRY_JSON_COLUMNS = ['favorite_tags', 'custom_answers', 'personality_tags'];

/** 返回 zod 错误的首条可读信息，非校验错误返回 null */
export function firstZodError(error) {
  if (error instanceof z.ZodError) {
    return error.issues?.[0]?.message || '参数校验失败';
  }
  return null;
}
