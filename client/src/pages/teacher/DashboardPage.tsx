import { useEffect, useState } from 'react';
import { App, Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AppstoreOutlined, FileOutlined, RobotOutlined, ScheduleOutlined } from '@ant-design/icons';
import { moduleService } from '../../services/moduleService';
import { aiService } from '../../services/aiService';
import { homeworkService } from '../../services/homeworkService';
import { getApiErrorMessage } from '../../services/http';
import type { AiStatus, ModuleDto } from '../../types';

export function DashboardPage() {
  const { message } = App.useApp();
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    moduleService
      .list()
      .then(setModules)
      .catch((err) => message.error(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
    aiService
      .status()
      .then(setStatus)
      .catch(() => {
        /* 状态获取失败不影响页面 */
      });
    homeworkService
      .list()
      .then((list) => setAssignmentCount(list.length))
      .catch(() => {
        /* 作业统计失败不影响页面 */
      });
  }, [message]);

  const totalResources = modules.reduce((sum, m) => sum + m.resourceCount, 0);

  const columns: ColumnsType<ModuleDto> = [
    { title: '模块', dataIndex: 'code', key: 'code', width: 80 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '资源数',
      dataIndex: 'resourceCount',
      key: 'resourceCount',
      width: 100,
      render: (count: number) => <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>,
    },
  ];

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        统计仪表盘
      </Typography.Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="教学模块数" value={modules.length} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="资源总数" value={totalResources} prefix={<FileOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="作业数" value={assignmentCount} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="AI 模式"
              value={status ? (status.mode === 'mock' ? '离线 Mock' : '真实大模型') : '—'}
              prefix={<RobotOutlined />}
            />
            {status && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                模型：{status.model}
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="各模块资源分布" size="small">
        <Table<ModuleDto>
          rowKey="id"
          columns={columns}
          dataSource={modules}
          loading={loading}
          pagination={false}
        />
      </Card>
    </>
  );
}
