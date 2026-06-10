import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/request';

export default function DashboardPage() {
  const [data, setData] = useState({ total: 0, trend: [] });

  useEffect(() => { api.get('/admin/stats').then((r) => setData(r.data)).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">统计概览</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">总提交数</p>
          <p className="text-3xl font-bold text-indigo-600">{data.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">今日新增</p>
          <p className="text-3xl font-bold text-emerald-600">
            {data.trend[data.trend.length - 1]?.count || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">提交天数</p>
          <p className="text-3xl font-bold text-amber-600">{data.trend.length}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">每日提交趋势</h2>
        {data.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="提交数" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-12">暂无数据</p>
        )}
      </div>
    </div>
  );
}
