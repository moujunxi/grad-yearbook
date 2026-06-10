import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entrySchema } from '../schemas/entrySchema';
import { favoriteTagOptions, labelOptions } from '../config/tags';
import { fetchQuestions, submitEntry } from '../lib/api';
import AvatarUpload from '../components/AvatarUpload';
import ThemeSelector from '../components/ThemeSelector';
import TagSelector from '../components/TagSelector';

const F = ({ children, label, required }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default function FormPage() {
  const nav = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [serverError, setServerError] = useState('');
  const [siteOpen, setSiteOpen] = useState(null); // null=loading
  const { register, handleSubmit, control, setValue, getValues, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(entrySchema), defaultValues: { name: '', gender: '', class_name: '', wechat: '', qq: '', phone: '', email: '', bio: '', motto: '', future: '', favorite_tags: [], label: '', bg_theme: 'solid-indigo', custom_answers: {} } });

  useEffect(() => {
    fetch('/api/config/site_open').then(r=>r.json()).then(d=>setSiteOpen(d.open)).catch(()=>setSiteOpen(true));
    fetchQuestions().then(setQuestions).catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    setServerError('');
    const fd = new FormData();
    if (data.avatar instanceof File) fd.append('avatar', data.avatar);
    fd.append('name', data.name);
    fd.append('gender', data.gender);
    fd.append('class_name', data.class_name);
    fd.append('wechat', data.wechat);
    fd.append('qq', data.qq);
    fd.append('phone', data.phone);
    fd.append('email', data.email);
    fd.append('bio', data.bio);
    fd.append('motto', data.motto);
    fd.append('future', data.future);
    fd.append('favorite_tags', JSON.stringify(data.favorite_tags));
    fd.append('label', data.label);
    fd.append('bg_theme', data.bg_theme);
    fd.append('custom_answers', JSON.stringify(data.custom_answers));
    try {
      const entry = await submitEntry(fd);
      nav('/thank-you', { state: { entry } });
    } catch (e) {
      setServerError(e.message);
    }
  };

  if (siteOpen === null) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ 加载中...</div>;
  if (!siteOpen) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-5xl">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800">填写已截止</h1>
        <p className="text-gray-500">同学录收集已结束，感谢参与！</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto space-y-6" noValidate>
        <h1 className="text-2xl font-bold text-center text-gray-800">📝 填写同学录</h1>

        {/* 基本信息 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">基本信息</h2>
          <F label="姓名" required>
            <input {...register('name')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="你的名字" />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="性别">
              <select {...register('gender')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none">
                <option value="">请选择</option><option value="男">男</option><option value="女">女</option>
              </select>
            </F>
            <F label="班级">
              <input {...register('class_name')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 初三(1)班" />
            </F>
          </div>
        </section>

        {/* 头像 */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">头像</h2>
          <Controller name="avatar" control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <AvatarUpload value={value} onChange={onChange} error={error?.message} />
            )} />
        </section>

        {/* 联系方式 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">联系方式</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="微信"><input {...register('wechat')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="微信号" /></F>
            <F label="QQ"><input {...register('qq')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="QQ号" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="手机"><input {...register('phone')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="手机号" /></F>
            <F label="邮箱"><input {...register('email')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="email@example.com" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </F>
          </div>
        </section>

        {/* 个人介绍 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">个人介绍</h2>
          <F label="一句话介绍"><textarea {...register('bio')} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="用几句话介绍自己..." /></F>
          <F label="座右铭"><input {...register('motto')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="你的人生格言" /></F>
          <F label="未来想做什么"><textarea {...register('future')} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="未来的梦想..." /></F>
        </section>

        {/* 标签 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">标签选择</h2>
          <Controller name="favorite_tags" control={control}
            render={({ field }) => (
              <TagSelector mode="multi" options={favoriteTagOptions} selected={field.value} onChange={field.onChange} label="最喜欢的歌手/作品/电影/爱好" />
            )} />
          <Controller name="label" control={control}
            render={({ field }) => (
              <TagSelector mode="single" options={labelOptions} selected={field.value} onChange={field.onChange} label="给自己打个标签" />
            )} />
        </section>

        {/* 背景主题 */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">选择卡片背景</h2>
          <Controller name="bg_theme" control={control}
            render={({ field }) => <ThemeSelector value={field.value} onChange={field.onChange} />} />
        </section>

        {/* 自定义问答 */}
        {questions.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">自定义问答</h2>
            {questions.map((q, i) => (
              <F key={i} label={typeof q === 'string' ? q : q.question || q}>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                  placeholder="你的回答..."
                  onChange={(e) => {
                    const key = typeof q === 'string' ? q : (q.question || q);
                    setValue('custom_answers', { ...getValues('custom_answers'), [key]: e.target.value });
                  }}
                />
              </F>
            ))}
          </section>
        )}

        {serverError && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2">{serverError}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
          {isSubmitting ? '提交中...' : '提交我的同学录'}
        </button>
      </form>
    </div>
  );
}
