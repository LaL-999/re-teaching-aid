import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Empty, Input, List, Modal, Space, Tag, Typography } from 'antd';
import { homeworkService } from '../../services/homeworkService';
import { getApiErrorMessage } from '../../services/http';
import type { Assignment } from '../../types';

function statusTag(assignment: Assignment) {
  const submission = assignment.mySubmission;
  if (!submission) {
    return <Tag>未提交</Tag>;
  }
  if (submission.graded) {
    return <Tag color="green">已批改 · {submission.score} 分</Tag>;
  }
  return <Tag color="blue">已提交 · 待批改</Tag>;
}

export function HomeworkPage() {
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
  }, [load]);

  const openSubmit = (assignment: Assignment): void => {
    setEditing(assignment);
    setContent(assignment.mySubmission?.content ?? '');
  };

  const handleSubmit = async (): Promise<void> => {
    if (!editing) {
      return;
    }
    setSubmitting(true);
    try {
      await homeworkService.submit(editing.id, content);
      message.success('提交成功');
      setEditing(null);
      void load();
    } catch (err) {
      // 空内容 → 「请输入作业内容」
      message.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        作业
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        查看老师布置的作业，提交你的作业内容，并查看批改成绩与评语。
      </Typography.Paragraph>

      {assignments.length === 0 && !loading ? (
        <Empty description="暂无作业" />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          loading={loading}
          dataSource={assignments}
          renderItem={(assignment) => {
            const submission = assignment.mySubmission;
            return (
              <List.Item>
                <Card
                  title={
                    <Space wrap>
                      <span>{assignment.title}</span>
                      {assignment.moduleName && <Tag color="blue">{assignment.moduleName}</Tag>}
                    </Space>
                  }
                  extra={statusTag(assignment)}
                  actions={[
                    <Button key="submit" type="link" onClick={() => openSubmit(assignment)}>
                      {submission ? '重新提交' : '提交作业'}
                    </Button>,
                  ]}
                >
                  <Typography.Paragraph style={{ minHeight: 44 }}>
                    {assignment.description || '（无说明）'}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    截止：{assignment.dueDate ?? '不限'}
                  </Typography.Text>
                  {submission?.graded && (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="success"
                      showIcon
                      message={`成绩：${submission.score} 分`}
                      description={submission.feedback ? `评语：${submission.feedback}` : '老师未留评语'}
                    />
                  )}
                </Card>
              </List.Item>
            );
          }}
        />
      )}

      <Modal
        open={editing !== null}
        title={editing ? `提交作业 · ${editing.title}` : '提交作业'}
        onCancel={() => setEditing(null)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText="提交"
        destroyOnHidden
      >
        {editing?.description && (
          <Alert
            type="info"
            showIcon
            message="作业要求"
            description={editing.description}
            style={{ marginBottom: 12 }}
          />
        )}
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="在此输入你的作业内容…"
        />
      </Modal>
    </>
  );
}
