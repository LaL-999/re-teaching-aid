import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, Row, Space, Spin, Tag, Typography } from 'antd';
import { EditOutlined, EyeOutlined, SlidersOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { PromptEditDrawer } from '../../components/PromptEditDrawer';
import { useAuthStore } from '../../store/authStore';
import type { PromptStageKey, PromptTemplate } from '../../types';

const OUTPUT_TAG: Record<PromptTemplate['output'], { color: string; text: string }> = {
  markdown: { color: 'blue', text: 'Markdown' },
  json: { color: 'purple', text: 'JSON' },
  code: { color: 'cyan', text: '代码' },
};

/**
 * 提示词工坊 —— 把流水线每个阶段的「AI 输出格式提示词」暴露到前端可视化编辑。
 * 教师可直接改写并即存即用（落盘后端，下次生成即采用）；学生为只读预览。
 */
export function PromptWorkshopPage() {
  const { message } = App.useApp();
  const role = useAuthStore((s) => s.user?.role);
  const isTeacher = role === 'teacher';
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editStage, setEditStage] = useState<PromptStageKey | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setTemplates(await aiService.promptTemplates());
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCloseDrawer = (): void => {
    setEditStage(null);
    void load();
  };

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <span className="stage-badge">
          <SlidersOutlined />
        </span>
        <div style={{ flex: 1 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            提示词工坊
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            自定义流水线每个阶段 AI 的「输出格式」。
            {isTeacher
              ? '教师编辑后即存即用，后端下次生成即采用新格式（可随时恢复默认）。'
              : '当前为学生只读视图，仅教师可编辑。'}
          </Typography.Paragraph>
        </div>
      </div>

      {loading && templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {templates.map((template) => {
            const tag = OUTPUT_TAG[template.output];
            return (
              <Col xs={24} md={12} xl={8} key={template.key}>
                <Card
                  size="small"
                  className="surface-card"
                  style={{ height: '100%' }}
                  title={template.label}
                  extra={<Tag color={tag.color}>{tag.text}</Tag>}
                >
                  <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
                    {template.description}
                  </Typography.Paragraph>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    {template.isCustom ? <Tag color="orange">已自定义</Tag> : <Tag>出厂默认</Tag>}
                    <Button
                      type={isTeacher ? 'primary' : 'default'}
                      icon={isTeacher ? <EditOutlined /> : <EyeOutlined />}
                      onClick={() => setEditStage(template.key)}
                    >
                      {isTeacher ? '编辑格式' : '查看格式'}
                    </Button>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {editStage && (
        <PromptEditDrawer stage={editStage} open={editStage !== null} onClose={handleCloseDrawer} />
      )}
    </div>
  );
}
