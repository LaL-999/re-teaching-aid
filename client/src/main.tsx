import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { themeConfig } from './theme';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('未找到根节点 #root');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntdApp>
        <ErrorBoundary>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
