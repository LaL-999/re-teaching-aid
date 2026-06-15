import { useState } from 'react';
import { Alert, App, Button, Form, Input, Typography } from 'antd';
import { ExperimentOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { getApiErrorMessage } from '../services/http';

interface LoginForm {
  studentId: string;
  password: string;
}

const HIGHLIGHTS = ['① 产品概要', '③ 具体需求', '④ 分析审查', '⑤ i* 建模', '⑥ UML', '⑦ SRS', '⑧ 需求追踪'];

export function LoginPage() {
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
      // 刷新页面使 workbenchStore 以当前用户 id 重新初始化 localStorage key，隔离不同用户数据
      window.location.replace('/app');
    } catch (err) {
      // 「学号或密码错误」「账号不存在」等后端文案在此展示，且停留在登录页
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <ExperimentOutlined />
          </span>
          <Typography.Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
            需求工程教学辅助系统
          </Typography.Text>
        </div>
        <Typography.Title style={{ color: '#fff', fontSize: 38, lineHeight: 1.25, margin: 0 }}>
          一句话想法，
          <br />
          端到端跑通需求工程
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.86)', fontSize: 16, marginTop: 16, maxWidth: 460 }}>
          AI 流水线把概要、需求、分析审查、建模、规格与追踪逐级串联；产物可版本迭代、输出格式可自定义。
        </Typography.Paragraph>
        <div style={{ marginTop: 18, maxWidth: 500 }}>
          {HIGHLIGHTS.map((item) => (
            <span className="login-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="login-form-pane">
        <div style={{ width: 360, maxWidth: '100%' }} className="fade-in-up">
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            欢迎回来
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            请使用学号与密码登录
          </Typography.Paragraph>

          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          <Form<LoginForm> layout="vertical" onFinish={handleFinish} requiredMark={false} disabled={loading}>
            <Form.Item name="studentId" label="学号" rules={[{ required: true, message: '请输入学号' }]}>
              <Input prefix={<UserOutlined />} placeholder="如 2024001" size="large" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>

          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            演示账号：教师 2024001 / 123456 · 学生 2024100 / 123456
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  );
}
