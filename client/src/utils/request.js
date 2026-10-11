import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/login')) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    // 把后端返回的 error 文案透传给调用方（如表单/按钮提示）
    const serverMsg = err.response?.data?.error;
    if (serverMsg) {
      const e = new Error(serverMsg);
      e.response = err.response;
      e.isServerError = true;
      return Promise.reject(e);
    }
    return Promise.reject(err);
  },
);

export default api;
