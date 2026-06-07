import { Suspense, useMemo } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Tag, Spin, theme } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ApartmentOutlined,
  AuditOutlined,
  BranchesOutlined,
  BulbOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  OrderedListOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';

const { Header, Sider, Content } = Layout;

// 需求工程流水线（顺序即生产顺序，与 src/pipeline.ts 一致）
const AI_TOOL_ITEMS: MenuProps['items'] = [
  { key: '/app/tools/overview', icon: <BulbOutlined />, label: '① 产品概要' },
  { key: '/app/tools/interview', icon: <SolutionOutlined />, label: '② 访谈提纲' },
  { key: '/app/tools/requirements', icon: <OrderedListOutlined />, label: '③ 具体需求' },
  { key: '/app/tools/review', icon: <AuditOutlined />, label: '④ 需求分析与审查' },
  { key: '/app/tools/istar', icon: <BranchesOutlined />, label: '⑤ i* 目标建模' },
  { key: '/app/tools/uml', icon: <ApartmentOutlined />, label: '⑥ UML 建模与预览' },
  { key: '/app/tools/srs', icon: <FileTextOutlined />, label: '⑦ SRS 规格说明书' },
];

function buildMenu(role: Role): MenuProps['items'] {
  if (role === 'teacher') {
    return [
      { key: '/app/resources', icon: <FolderOpenOutlined />, label: '资源管理' },
      { key: 'tools', icon: <ExperimentOutlined />, label: '需求工程流水线', children: AI_TOOL_ITEMS },
      { key: '/app/homework', icon: <ScheduleOutlined />, label: '作业管理' },
      { key: '/app/dashboard', icon: <DashboardOutlined />, label: '统计仪表盘' },
    ];
  }
  return [
    { key: '/app/browse', icon: <FolderOpenOutlined />, label: '课件浏览' },
    { key: '/app/my-homework', icon: <ScheduleOutlined />, label: '作业' },
    { key: 'tools', icon: <ExperimentOutlined />, label: '需求工程流水线', children: AI_TOOL_ITEMS },
  ];
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const items = useMemo(() => buildMenu(user?.role ?? 'student'), [user?.role]);

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  const userMenu: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={220}
        breakpoint="lg"
        collapsedWidth="0"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
          }}
        >
          <Typography.Text strong style={{ fontSize: 15 }}>
            需求工程教学辅助
          </Typography.Text>
        </div>
        <Menu
          mode="inline"
          items={items}
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['tools']}
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              navigate(key);
            }
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            需求工程教学辅助系统
          </Typography.Title>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <span style={{ cursor: 'pointer', userSelect: 'none' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              {user?.name}
              <Tag color={user?.role === 'teacher' ? 'blue' : 'green'} style={{ marginLeft: 8 }}>
                {user?.role === 'teacher' ? '教师' : '学生'}
              </Tag>
            </span>
          </Dropdown>
        </Header>
        <Content
          style={{ margin: 16, padding: 20, background: colorBgContainer, borderRadius: 8 }}
        >
          <Suspense
            fallback={
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <Spin size="large" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
