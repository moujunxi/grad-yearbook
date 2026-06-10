import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../utils/request';
import { entrySchema } from '../../schemas/entrySchema';
import { favoriteTagOptions, labelOptions } from '../../config/tags';
import AvatarUpload from '../../components/AvatarUpload';
import ThemeSelector from '../../components/ThemeSelector';
import TagSelector from '../../components/TagSelector';

export default function EditEntryPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, control, setValue, reset, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(entrySchema) });

  useEffect(() => {
    api.get(`/admin/entries/${id}`).then(({ data }) => {
      reset({ ...data, avatar: null });
      setLoading(false);
    }).catch(() => nav('/admin/entries'));
  }, [id, reset, nav]);

  const onSubmit = async (data) => {
    const fd = new FormData();
    if (data.avatar instanceof File) fd.append('avatar', data.avatar);
    fd.append('name', data.name);
    ['gender', 'class_name', 'wechat', 'qq', 'phone', 'email', 'bio', 'motto', 'future', 'label', 'bg_theme'].forEach(k => fd.append(k, data[k] || ''));
    fd.append('favorite_tags', JSON.stringify(data.favorite_tags));
    fd.append('custom_answers', JSON.stringify(data.custom_answers));
    await api.put(`/admin/entries/${id}`, data);
    nav(`/admin/entries/${id}`);
  };

  if (loading) return <p className="text-gray-400 text-center py-12">加载中...</p>;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <Link to={`/admin/entries/${id}`} className="text-indigo-600 hover:underline text-sm">← 返回详情</Link>
      <h1 className="text-2xl font-bold text-gray-800">编辑条目</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div><label className="text-sm font-medium text-gray-700">姓名 *</label>
            <input {...register('name')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700">性别</label>
              <select {...register('gender')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none">
                <option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">班级</label>
              <input {...register('class_name')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" /></div>
          </div>
        </section>
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">头像</h2>
          <Controller name="avatar" control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <AvatarUpload value={value} onChange={onChange} error={error?.message} />)} />
        </section>
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">联系方式</h2>
          <div className="grid grid-cols-2 gap-4">
            {[['wechat','微信'],['qq','QQ'],['phone','手机'],['email','邮箱']].map(([k,l])=>(
              <div key={k}><label className="text-sm font-medium text-gray-700">{l}</label>
                <input {...register(k)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" />
                {errors[k] && <p className="text-red-500 text-xs">{errors[k].message}</p>}</div>
            ))}
          </div>
        </section>
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">个人介绍</h2>
          {[['bio','一句话介绍'],['motto','座右铭'],['future','未来想做什么']].map(([k,l])=>(
            <div key={k}><label className="text-sm font-medium text-gray-700">{l}</label>
              <textarea {...register(k)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" /></div>
          ))}
        </section>
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold">标签</h2>
          <Controller name="favorite_tags" control={control}
            render={({ field }) => <TagSelector mode="multi" options={favoriteTagOptions} selected={field.value} onChange={field.onChange} label="兴趣爱好" />} />
          <Controller name="label" control={control}
            render={({ field }) => <TagSelector mode="single" options={labelOptions} selected={field.value} onChange={field.onChange} label="个性标签" />} />
        </section>
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">背景主题</h2>
          <Controller name="bg_theme" control={control}
            render={({ field }) => <ThemeSelector value={field.value} onChange={field.onChange} />} />
        </section>
        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50">
          {isSubmitting ? '保存中...' : '保存修改'}
        </button>
      </form>
    </div>
  );
}
