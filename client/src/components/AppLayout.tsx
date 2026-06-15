import { Suspense, useMemo, useState } from 'react';
import { Layout, Menu, Avatar, Button, Dropdown, Typography, Tag, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ApartmentOutlined,
  AuditOutlined,
  BranchesOutlined,
  BulbOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  RocketOutlined,
  ScheduleOutlined,
  SlidersOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';

const { Header, Sider, Content } = Layout;

// 需求工程流水线（顺序即生产顺序，与 src/pipeline.ts 一致），含驾驶舱与提示词工坊
const PIPELINE_ITEMS: MenuProps['items'] = [
  { key: '/app/pipeline', icon: <RocketOutlined />, label: '流水线驾驶舱' },
  { key: '/app/tools/overview', icon: <BulbOutlined />, label: '① 产品概要' },
  { key: '/app/tools/interview', icon: <SolutionOutlined />, label: '② 访谈提纲' },
  { key: '/app/tools/requirements', icon: <OrderedListOutlined />, label: '③ 具体需求' },
  { key: '/app/tools/review', icon: <AuditOutlined />, label: '④ 需求分析与审查' },
  { key: '/app/tools/istar', icon: <BranchesOutlined />, label: '⑤ i* 目标建模' },
  { key: '/app/tools/uml', icon: <ApartmentOutlined />, label: '⑥ UML 建模与预览' },
  { key: '/app/tools/srs', icon: <FileTextOutlined />, label: '⑦ SRS 规格说明书' },
  { key: '/app/tools/trace', icon: <DeploymentUnitOutlined />, label: '⑧ 需求追踪矩阵' },
  { key: '/app/workshop', icon: <SlidersOutlined />, label: '提示词工坊' },
];

function buildMenu(role: Role): MenuProps['items'] {
  const pipeline = {
    key: 'tools',
    icon: <ExperimentOutlined />,
    label: '需求工程流水线',
    children: PIPELINE_ITEMS,
  };
  if (role === 'teacher') {
    return [
      { key: '/app/resources', icon: <FolderOpenOutlined />, label: '资源管理' },
      pipeline,
      { key: '/app/homework', icon: <ScheduleOutlined />, label: '作业管理' },
      { key: '/app/dashboard', icon: <DashboardOutlined />, label: '统计仪表盘' },
    ];
  }
  return [
    { key: '/app/browse', icon: <FolderOpenOutlined />, label: '课件浏览' },
    { key: '/app/my-homework', icon: <ScheduleOutlined />, label: '作业' },
    pipeline,
  ];
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const items = useMemo(() => buildMenu(user?.role ?? 'student'), [user?.role]);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = (): void => {
    logout();
    // 刷新页面使 workbenchStore 以 'guest' key 重新初始化，避免下一位用户看到前一位的数据
    window.location.replace('/login');
  };

  const userMenu: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={232}
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onCollapse={setCollapsed}
        onBreakpoint={(broken) => setCollapsed(broken)}
        trigger={null}
        style={{ borderRight: '1px solid #eceef5' }}
      >
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 6px 14px -4px rgba(99,102,241,0.6)',
              flex: 'none',
            }}
          >
            <ExperimentOutlined />
          </span>
          <Typography.Text strong style={{ fontSize: 15, lineHeight: 1.2 }}>
            需求工程
            <br />
            教学辅助
          </Typography.Text>
        </div>
        <Menu
          mode="inline"
          items={items}
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['tools']}
          style={{ borderInlineEnd: 'none', padding: '4px 0' }}
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              navigate(key);
            }
          }}
        />
      </Sider>
      <Layout>
        <Header
          className="glass-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              aria-label={collapsed ? '展开导航' : '收起导航'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
            />
            <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              需求工程教学辅助系统
            </Typography.Title>
          </div>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <span
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                borderRadius: 10,
              }}
            >
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#6366f1' }} />
              <span style={{ fontWeight: 500 }}>{user?.name}</span>
              <Tag color={user?.role === 'teacher' ? 'geekblue' : 'green'} style={{ margin: 0 }}>
                {user?.role === 'teacher' ? '教师' : '学生'}
              </Tag>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 18, padding: 22, background: '#ffffff', borderRadius: 16 }}>
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
