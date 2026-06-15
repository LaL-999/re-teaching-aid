import { useEffect, useState } from 'react';
import { Alert, App, Button, Drawer, Input, Space, Spin, Tag, Typography } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { aiService } from '../services/aiService';
import { getApiErrorMessage } from '../services/http';
import { useAuthStore } from '../store/authStore';
import type { PromptStageKey, PromptTemplate } from '../types';

interface PromptEditDrawerProps {
  stage: PromptStageKey;
  open: boolean;
  onClose: () => void;
}

const OUTPUT_HINT: Record<PromptTemplate['output'], string> = {
  markdown: '该阶段输出 Markdown 文本，可自由调整结构与措辞。',
  json: '该阶段输出 JSON 供系统解析，请保留 JSON 结构与字段要求，否则可能解析失败（可随时重置）。',
  code: '该阶段输出代码（如 PlantUML / i*），请保留代码格式要求，否则可能无法编译（可随时重置）。',
};

/**
 * 提示词工坊：编辑某个流水线阶段的「输出格式提示词」。
 * 教师可编辑并即存即用（落盘 prompt-templates.json，后端下次生成即采用）；学生只读。
 */
export function PromptEditDrawer({ stage, open, onClose }: PromptEditDrawerProps) {
  const { message } = App.useApp();
  const role = useAuthStore((s) => s.user?.role);
  const isTeacher = role === 'teacher';
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    aiService
      .promptTemplates()
      .then((templates) => {
        if (!alive) return;
        const found = templates.find((t) => t.key === stage) ?? null;
        setTemplate(found);
        setDraft(found?.system ?? '');
      })
      .catch((err) => message.error(getApiErrorMessage(err)))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, stage, message]);

  const handleSave = async (): Promise<void> => {
    if (!draft.trim()) {
      message.warning('提示词不能为空');
      return;
    }
    setSaving(true);
    try {
      const updated = await aiService.updatePromptTemplate(stage, draft.trim());
      setTemplate(updated);
      setDraft(updated.system);
      message.success('已保存，下次生成即采用新格式');
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    setSaving(true);
    try {
      const updated = await aiService.resetPromptTemplate(stage);
      setTemplate(updated);
      setDraft(updated.system);
      message.success('已恢复出厂提示词');
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const dirty = template ? draft.trim() !== template.system.trim() : false;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={620}
      title={
        <Space>
          <span>编辑输出格式</span>
          {template && <Tag color="geekblue">{template.label}</Tag>}
          {template?.isCustom && <Tag color="orange">已自定义</Tag>}
        </Space>
      }
      destroyOnHidden
      extra={
        isTeacher && (
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              loading={saving}
              disabled={!template?.isCustom}
            >
              恢复默认
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!dirty}
            >
              保存
            </Button>
          </Space>
        )
      }
    >
      {loading || !template ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            {template.description}
          </Typography.Paragraph>
          <Alert type="info" showIcon message={OUTPUT_HINT[template.output]} />
          {!isTeacher && (
            <Alert type="warning" showIcon message="仅教师可编辑输出格式，此处为只读预览。" />
          )}
          <div>
            <Typography.Text strong>系统提示词（输出格式指令）</Typography.Text>
            <Input.TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoSize={{ minRows: 12, maxRows: 26 }}
              readOnly={!isTeacher}
              style={{ marginTop: 6, fontFamily: "'Fira Code', Consolas, monospace", fontSize: 13 }}
            />
          </div>
          {template.isCustom && (
            <details>
              <summary style={{ cursor: 'pointer', color: '#6b6f86' }}>查看出厂默认提示词</summary>
              <pre className="code-block" style={defaultBox}>
                {template.default}
              </pre>
            </details>
          )}
        </Space>
      )}
    </Drawer>
  );
}

const defaultBox: React.CSSProperties = {
  marginTop: 8,
  whiteSpace: 'pre-wrap',
  background: '#fafafe',
  border: '1px solid #eceef5',
  padding: 12,
  borderRadius: 8,
  maxHeight: 240,
  overflow: 'auto',
};
