import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entrySchema } from '../schemas/entrySchema';
import { fetchQuestions, submitEntry } from '../lib/api';
import AvatarUpload from '../components/AvatarUpload';
import ThemeSelector from '../components/ThemeSelector';
import SignaturePad from '../components/SignaturePad';

const F = ({ children, label, required }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const personalityOptions = [
  '胆小闷骚', '活泼可爱', '搞笑担当', '古灵精怪',
  '多才多艺', '果敢强势', '成熟稳重', '玉树临风',
  '心地善良', '校园歌神', '无敌学霸', '美丽大方',
];

export default function FormPage() {
  const nav = useNavigate();
  const [serverError, setServerError] = useState('');
  const [blessingMessage, setBlessingMessage] = useState('');
  const [siteOpen, setSiteOpen] = useState(null);
  const { register, handleSubmit, control, getValues, setValue, watch, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(entrySchema), defaultValues: {
      name: '', nickname: '', gender: '', class_name: '', birthday: '', zodiac: '',
      wechat: '', qq: '', phone: '', email: '',
      favorite_color: '', favorite_book: '', favorite_movie: '', favorite_star: '',
      favorite_singer: '', favorite_song: '', favorite_food: '', dream_place: '',
      future: '', first_meeting: '', personality_tags: [],
      favorite_tags: [], label: '', bg_theme: 'pattern-dots',
      custom_answers: {}, secret_message: '', signature: '', identity_code: '',
    } });

  const personalityTags = watch('personality_tags') || [];

  useEffect(() => {
    fetch('/api/config/site_open').then(r=>r.json()).then(d=>setSiteOpen(d.open)).catch(()=>setSiteOpen(true));
  }, []);

  const togglePersonality = (tag) => {
    const current = getValues('personality_tags') || [];
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    setValue('personality_tags', next);
  };

  const onSubmit = async (data) => {
    setServerError('');
    const fd = new FormData();
    if (data.avatar instanceof File) fd.append('avatar', data.avatar);
    fd.append('name', data.name);
    fd.append('nickname', data.nickname);
    fd.append('gender', data.gender);
    fd.append('class_name', data.class_name);
    fd.append('birthday', data.birthday);
    fd.append('zodiac', data.zodiac);
    fd.append('wechat', data.wechat);
    fd.append('qq', data.qq);
    fd.append('phone', data.phone);
    fd.append('email', data.email);
    fd.append('favorite_color', data.favorite_color);
    fd.append('favorite_book', data.favorite_book);
    fd.append('favorite_movie', data.favorite_movie);
    fd.append('favorite_star', data.favorite_star);
    fd.append('favorite_singer', data.favorite_singer);
    fd.append('favorite_song', data.favorite_song);
    fd.append('favorite_food', data.favorite_food);
    fd.append('dream_place', data.dream_place);
    fd.append('future', data.future);
    fd.append('first_meeting', data.first_meeting);
    fd.append('personality_tags', JSON.stringify(data.personality_tags || []));
    fd.append('favorite_tags', JSON.stringify(data.favorite_tags || []));
    fd.append('label', data.label);
    fd.append('bg_theme', data.bg_theme);
    fd.append('custom_answers', JSON.stringify(data.custom_answers));
    fd.append('secret_message', data.secret_message);
    fd.append('signature', data.signature);
    fd.append('identity_code', data.identity_code);
    try {
      const entry = await submitEntry(fd);
      nav('/thank-you', { state: { entry, blessingMessage } });
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

        {/* 基本信息 + 头像 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">基本信息</h2>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <Controller name="avatar" control={control}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <AvatarUpload value={value} onChange={onChange} error={error?.message} />
                )} />
            </div>
            <div className="flex-1 space-y-3">
              <F label="姓名" required>
                <input {...register('name')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="你的名字" />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </F>
              <F label="昵称"><input {...register('nickname')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="你的昵称" /></F>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="生日"><input {...register('birthday')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 2006-05-20" /></F>
            <F label="星座"><input {...register('zodiac')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 天蝎座" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="手机"><input {...register('phone')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="手机号" /></F>
            <F label="微信"><input {...register('wechat')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="微信号" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="邮件"><input {...register('email')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="email@example.com" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </F>
            <F label="QQ"><input {...register('qq')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="QQ号" /></F>
          </div>
        </section>

        {/* 喜好 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">喜好档案</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="喜欢的颜色"><input {...register('favorite_color')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 蓝色" /></F>
            <F label="喜欢的书籍"><input {...register('favorite_book')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 三体" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="喜欢的电影"><input {...register('favorite_movie')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 千与千寻" /></F>
            <F label="喜欢的明星"><input {...register('favorite_star')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 周杰伦" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="喜欢的歌手"><input {...register('favorite_singer')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 林俊杰" /></F>
            <F label="喜欢的歌曲"><input {...register('favorite_song')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 晴天" /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="爱吃的食物"><input {...register('favorite_food')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 火锅" /></F>
            <F label="想去的地方"><input {...register('dream_place')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="如 日本" /></F>
          </div>
        </section>

        {/* 留言与梦想 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">心愿墙</h2>
          <F label="人生的梦想"><textarea {...register('future')} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="未来的梦想..." /></F>
          <F label="我们第一次见面的情形"><textarea {...register('first_meeting')} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="还记得第一次见面..." /></F>
        </section>

        {/* 在你眼中的我是 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">在你眼中的我是（多选题）</h2>
          <div className="grid grid-cols-2 gap-3">
            {personalityOptions.map(tag => (
              <label key={tag}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${
                  personalityTags.includes(tag)
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                <input type="checkbox" className="sr-only" checked={personalityTags.includes(tag)}
                  onChange={() => togglePersonality(tag)} />
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  personalityTags.includes(tag) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                }`}>
                  {personalityTags.includes(tag) && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </span>
                {tag}
              </label>
            ))}
          </div>
        </section>

        {/* 留言 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">💌 留言</h2>
          <F label="留言（仅他可见）">
            <textarea {...register('secret_message')} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" />
          </F>
        </section>

        {/* 手写签名 */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">✍️ 个性签名</h2>
          <p className="text-xs text-gray-400">可在下方签名区手写或绘制你的签名（可选）</p>
          <Controller name="signature" control={control}
            render={({ field: { value, onChange } }) => (
              <SignaturePad value={value} onChange={onChange} />
            )} />
        </section>

        {serverError && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2">{serverError}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
          {isSubmitting ? '提交中...' : '提交我的同学录'}
        </button>
      </form>
    </div>
  );
}
