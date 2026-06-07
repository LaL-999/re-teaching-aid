/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 前端开发服务器：5173；/api 反向代理到后端 4000，避免开发期跨域。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 路由已按页 React.lazy 懒加载；首屏共享块主要是 Ant Design 核心（约 900KB，
    // 各路由都依赖、本就会进首屏），属固有体积，故据实放宽告警阈值。
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
