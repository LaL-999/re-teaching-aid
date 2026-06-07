import { useState } from 'react';
import { App, Button, Card, Input, Space, Typography } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { AiModeBanner } from '../../components/AiModeBanner';
import { PipelineNav } from '../../components/PipelineNav';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { MarkdownView } from '../../components/MarkdownView';
import { useWorkbench } from '../../store/workbenchStore';

export function RequirementsPage() {
  const { message } = App.useApp();
  const source = useWorkbench((s) => s.data.requirements.source);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const overview = useWorkbench((s) => s.data.overview.overview);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const [loading, setLoading] = useState(false);

  const loadFromOverview = (): void => {
    if (!overview.trim()) {
      message.warning('① 产品概要尚未生成');
      return;
    }
    patch('requirements', { source: overview });
    message.success('已载入产品概要');
  };

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await aiService.requirements(source.trim());
      patch('requirements', { requirements: result.requirements });
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        ③ 具体需求
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        基于产品概要或需求素材，AI 拆分功能模块并以用户故事 + 验收标准的形式产出具体功能需求，供「需求分析与审查」进一步打磨。
      </Typography.Paragraph>

      <PipelineNav current="requirements" />
      <AiModeBanner />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={source}
          onChange={(e) => patch('requirements', { source: e.target.value })}
          rows={6}
          placeholder="粘贴产品概要或需求素材；也可点击下方「从产品概要载入」。"
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button type="primary" size="large" loading={loading} onClick={handleGenerate}>
            生成具体需求
          </Button>
          <Button icon={<ImportOutlined />} onClick={loadFromOverview}>
            从 ① 产品概要载入
          </Button>
        </Space>
      </Card>

      {requirements && (
        <Card size="small" title="具体功能需求">
          <MarkdownView markdown={requirements} />
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <PipelineStageActions
              content={requirements}
              stageLabel="具体需求"
              downloadName="具体需求.md"
              onRefined={(refined) => patch('requirements', { requirements: refined })}
              onClear={() => reset('requirements')}
              nextTargets={[
                {
                  label: '发送到 ④ 需求分析与审查',
                  to: '/app/tools/review',
                  apply: (content) => patch('review', { text: content }),
                },
              ]}
            />
          </div>
        </Card>
      )}
    </>
  );
}
