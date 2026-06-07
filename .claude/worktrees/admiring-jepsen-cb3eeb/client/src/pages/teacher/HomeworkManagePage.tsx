import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { homeworkService } from '../../services/homeworkService';
import { moduleService } from '../../services/moduleService';
import { getApiErrorMessage } from '../../services/http';
import type { Assignment, ModuleDto, Submission } from '../../types';

interface CreateFormValues {
  title: string;
  description?: string;
  moduleId?: number;
  dueDate?: string;
}

function SubmissionGradeCard({
  submission,
  onGraded,
}: {
  submission: Submission;
  onGraded: () => void;
}) {
  const { message } = App.useApp();
  const [score, setScore] = useState<number | null>(submission.score);
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (): Promise<void> => {
    if (score === null) {
      message.error('请输入分数');
      return;
    }
    setSaving(true);
    try {
      await homeworkService.grade(submission.id, score, feedback);
      message.success('批改已保存');
      onGraded();
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Space wrap>
          <Typography.Text strong>{submission.studentName}</Typography.Text>
          <Tag>{submission.studentNo}</Tag>
          {submission.graded && <Tag color="green">已批改 {submission.score} 分</Tag>}
        </Space>
      }
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {submission.submittedAt}
        </Typography.Text>
      }
    >
      <pre
        className="code-block"
        style={{
          whiteSpace: 'pre-wrap',
          background: '#fafafa',
          padding: 10,
          borderRadius: 6,
          marginTop: 0,
        }}
      >
        {submission.content}
      </pre>
      <Space align="start" style={{ width: '100%' }} wrap>
        <InputNumber
          min={0}
          max={100}
          value={score}
          onChange={(value) => setScore(value)}
          placeholder="分数"
          addonAfter="分"
        />
        <Input.TextArea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          placeholder="评语（可选）"
          style={{ width: 360, maxWidth: '100%' }}
        />
        <Button type="primary" loading={saving} onClick={save}>
          保存批改
        </Button>
      </Space>
    </Card>
  );
}

export function HomeworkManagePage() {
  const { message, modal } = App.useApp();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();
  const [viewing, setViewing] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setAssignments(await homeworkService.list());
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
    moduleService
      .list()
      .then(setModules)
      .catch(() => undefined);
  }, [load]);

  const openSubmissions = async (assignment: Assignment): Promise<void> => {
    setViewing(assignment);
    setSubsLoading(true);
    try {
      setSubmissions(await homeworkService.listSubmissions(assignment.id));
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSubsLoading(false);
    }
  };

  const reloadSubmissions = async (): Promise<void> => {
    if (!viewing) {
      return;
    }
    try {
      setSubmissions(await homeworkService.listSubmissions(viewing.id));
      void load();
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async (): Promise<void> => {
    const values = await form.validateFields();
    setCreating(true);
    try {
      await homeworkService.create({
        title: values.title,
        description: values.description ?? '',
        moduleId: values.moduleId ?? null,
        dueDate: (values.dueDate ?? '').trim() || null,
      });
      message.success('作业已布置');
      form.resetFields();
      setCreateOpen(false);
      void load();
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (assignment: Assignment): void => {
    modal.confirm({
      title: `删除作业「${assignment.title}」？`,
      content: '该作业的全部学生提交也将一并删除，不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await homeworkService.remove(assignment.id);
          message.success('已删除');
          void load();
        } catch (err) {
          message.error(getApiErrorMessage(err));
        }
      },
    });
  };

  const ellipsisStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

  const columns: ColumnsType<Assignment> = [
    {
      title: '作业标题',
      dataIndex: 'title',
      key: 'title',
      // 不设宽度，作为弹性列吸收剩余空间；fixed 布局下标题/描述自动单行省略，不再撑垮其它列
      render: (_value, record) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, ...ellipsisStyle }}>{record.title}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#8c8c8c', ...ellipsisStyle }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '所属模块',
      dataIndex: 'moduleName',
      key: 'moduleName',
      width: 130,
      render: (name: string | null) => (name ? <Tag color="blue">{name}</Tag> : '—'),
    },
    { title: '截止日期', dataIndex: 'dueDate', key: 'dueDate', width: 110, render: (d) => d ?? '—' },
    {
      title: '提交/批改',
      key: 'stat',
      width: 96,
      render: (_value, record) => (
        <span>
          {record.submissionCount ?? 0} / {record.gradedCount ?? 0}
        </span>
      ),
    },
    { title: '布置时间', dataIndex: 'createdAt', key: 'createdAt', width: 168 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_value, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openSubmissions(record)}>
            提交
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          作业管理
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          布置作业
        </Button>
      </Space>
      <Typography.Paragraph type="secondary">
        布置作业、查看学生提交并批改打分。学生可在「作业」页提交与查看成绩。
      </Typography.Paragraph>

      <Table<Assignment>
        rowKey="id"
        columns={columns}
        dataSource={assignments}
        loading={loading}
        pagination={false}
        tableLayout="fixed"
        locale={{ emptyText: <Empty description="暂无作业，点击右上角布置" /> }}
      />

      <Modal
        open={createOpen}
        title="布置作业"
        onCancel={() => {
          form.resetFields();
          setCreateOpen(false);
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="布置"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="作业标题" rules={[{ required: true, message: '请输入作业标题' }]}>
            <Input placeholder="如 访谈提纲设计练习" />
          </Form.Item>
          <Form.Item name="description" label="作业说明">
            <Input.TextArea rows={3} placeholder="作业要求、提交内容说明等" />
          </Form.Item>
          <Form.Item name="moduleId" label="关联模块（可选）">
            <Select
              allowClear
              placeholder="可关联到某教学模块"
              options={modules.map((m) => ({ value: m.id, label: `${m.code} ${m.name}` }))}
            />
          </Form.Item>
          <Form.Item name="dueDate" label="截止日期（可选）">
            <Input placeholder="如 2026-06-30" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={viewing !== null}
        title={viewing ? `提交情况 · ${viewing.title}` : '提交情况'}
        width={620}
        onClose={() => setViewing(null)}
        destroyOnHidden
      >
        {subsLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin />
          </div>
        ) : submissions.length === 0 ? (
          <Empty description="暂无学生提交" />
        ) : (
          submissions.map((submission) => (
            <SubmissionGradeCard
              key={submission.id}
              submission={submission}
              onGraded={reloadSubmissions}
            />
          ))
        )}
      </Drawer>
    </>
  );
}
