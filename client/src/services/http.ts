import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

/** 全局 axios 实例。开发期 baseURL 为空 → 走 /api 由 Vite 代理到后端。 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  // 略大于服务端 LLM 超时（120s），让前端等得比后端久，避免推理模型生成长文时前端先掐断
  timeout: 130_000,
});

// 请求拦截：附带 JWT
http.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 自动登出（路由守卫随即跳转登录页）
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // token 失效时刷新页面，确保 workbenchStore 清除当前用户的内存数据
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: { message?: string; code?: string };
}

/** 从任意错误中提炼面向用户的中文消息。UI 统一用它展示。 */
export function getApiErrorMessage(error: unknown, fallback = '请求失败，请稍后重试'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (error.code === 'ECONNABORTED') {
      return '请求超时，请稍后重试';
    }
    if (!error.response) {
      return '无法连接服务器，请检查网络或后端是否已启动';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
