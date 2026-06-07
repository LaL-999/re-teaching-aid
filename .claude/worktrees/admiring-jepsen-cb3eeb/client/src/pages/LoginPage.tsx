import { useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { getApiErrorMessage } from '../services/http';

interface LoginForm {
  studentId: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async (values: LoginForm): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await authService.login(values.studentId.trim(), values.password);
      setAuth(token, user);
      message.success(`欢迎，${user.name}`);
      navigate('/app', { replace: true });
    } catch (err) {
      // 「学号或密码错误」「账号不存在」等后端文案在此展示，且停留在登录页
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(22,119,255,0.13), rgba(82,196,26,0.08))',
        padding: 16,
      }}
    >
      <Card style={{ width: 384, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 2 }}>
          需求工程教学辅助系统
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          请使用学号与密码登录
        </Typography.Paragraph>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Form<LoginForm>
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          disabled={loading}
        >
          <Form.Item name="studentId" label="学号" rules={[{ required: true, message: '请输入学号' }]}>
            <Input prefix={<UserOutlined />} placeholder="如 2024001" size="large" autoFocus />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
          演示账号：教师 2024001 / 123456 · 学生 2024100 / 123456
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
