import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import { LoginPage } from './LoginPage';

function renderLogin() {
  return render(
    <ConfigProvider>
      <AntdApp>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AntdApp>
    </ConfigProvider>,
  );
}

describe('LoginPage', () => {
  it('渲染标题、学号输入框与登录按钮', () => {
    renderLogin();
    expect(screen.getByText('需求工程教学辅助系统')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('如 2024001')).toBeInTheDocument();
    // Ant Design 会在两个中文字之间插入空格，可访问名为「登 录」
    expect(screen.getByRole('button', { name: /登\s*录/ })).toBeInTheDocument();
  });

  it('展示演示账号提示', () => {
    renderLogin();
    expect(screen.getByText(/演示账号/)).toBeInTheDocument();
  });
});
