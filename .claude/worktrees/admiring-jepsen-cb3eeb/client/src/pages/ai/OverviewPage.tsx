import { useState } from 'react';
import { App, Button, Card, Input, Typography } from 'antd';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { AiModeBanner } from '../../components/AiModeBanner';
import { PipelineNav } from '../../components/PipelineNav';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { MarkdownView } from '../../components/MarkdownView';
import { useWorkbench } from '../../store/workbenchStore';

export function OverviewPage() {
  const { message } = App.useApp();
  const idea = useWorkbench((s) => s.data.overview.idea);
  const overview = useWorkbench((s) => s.data.overview.overview);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await aiService.overview(idea.trim());
      patch('overview', { overview: result.overview });
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        ① 产品概要
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        输入一句话产品想法或项目领域，AI 生成包含背景、目标、范围、干系人与核心功能的产品概要，作为后续「具体需求」的输入。
      </Typography.Paragraph>

      <PipelineNav current="overview" />
      <AiModeBanner />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={idea}
          onChange={(e) => patch('overview', { idea: e.target.value })}
          rows={3}
          placeholder="如 校园外卖系统 / 智慧图书馆 / 校园二手书交易平台"
        />
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleGenerate}
          style={{ marginTop: 12 }}
        >
          生成产品概要
        </Button>
      </Card>

      {overview && (
        <Card size="small" title="产品概要">
          <MarkdownView markdown={overview} />
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <PipelineStageActions
              content={overview}
              stageLabel="产品概要"
              downloadName="产品概要.md"
              onRefined={(refined) => patch('overview', { overview: refined })}
              onClear={() => reset('overview')}
              nextTargets={[
                {
                  label: '发送到 ③ 具体需求',
                  to: '/app/tools/requirements',
                  apply: (content) => patch('requirements', { source: content }),
                },
              ]}
            />
          </div>
        </Card>
      )}
    </>
  );
}
