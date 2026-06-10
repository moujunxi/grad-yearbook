import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const entrySchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50字'),
  gender: z.string().max(4).optional().default(''),
  class_name: z.string().max(50).optional().default(''),
  avatar: z
    .any()
    .optional()
    .refine((f) => !f || f instanceof File, '必须是文件')
    .refine((f) => !f || f.size <= MAX_FILE_SIZE, '图片不超过5MB')
    .refine(
      (f) => !f || ACCEPTED_IMAGE_TYPES.includes(f.type),
      '仅支持 JPG / PNG / GIF / WebP'
    ),
  wechat: z.string().max(100).optional().default(''),
  qq: z.string().max(50).optional().default(''),
  phone: z.string().max(30).optional().default(''),
  email: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), '邮箱格式不正确'),
  bio: z.string().max(500).optional().default(''),
  motto: z.string().max(200).optional().default(''),
  future: z.string().max(500).optional().default(''),
  favorite_tags: z.array(z.string()).optional().default([]),
  label: z.string().max(50).optional().default(''),
  bg_theme: z.string().optional().default('solid-indigo'),
  custom_answers: z.record(z.string(), z.string()).optional().default({}),
});
