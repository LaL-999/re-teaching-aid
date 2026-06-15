import { useState } from 'react';
import { App, Button, Card, Input, Space } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { MarkdownView } from '../../components/MarkdownView';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { VersionTimeline } from '../../components/VersionTimeline';
import { useWorkbench } from '../../store/workbenchStore';

/**
 * ① 产品概要 —— 流水线起点。用户输入一句话想法，AI 产出结构化产品概要，
 * 可直接「发送到 ③ 具体需求」，让整条流水线由一句话端到端打通。
 * 本页为各阶段页的「黄金范本」：StageScaffold + 版本树 + 审核优化 + 下游流转 + 可编辑输出格式。
 */
export function OverviewPage() {
  const { message } = App.useApp();
  const idea = useWorkbench((s) => s.data.overview.idea);
  const overview = useWorkbench((s) => s.data.overview.overview);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await aiService.overview(idea.trim());
      patch('overview', { overview: result.overview });
      saveVersion('overview', '生成', result.overview);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StageScaffold
      badge="①"
      title="产品概要"
      subtitle="输入一句话产品想法，AI 产出含背景 / 目标 / 干系人 / 范围 / 功能概要的结构化概要，作为整条流水线的起点。"
      navCurrent="overview"
      promptStage="overview"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={idea}
          onChange={(e) => patch('overview', { idea: e.target.value })}
          autoSize={{ minRows: 3, maxRows: 8 }}
          placeholder="用一句话描述你的产品想法，如：一个面向校园的二手书在线交易与自提平台"
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button
            type="primary"
            size="large"
            icon={<BulbOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!idea.trim()}
          >
            生成产品概要
          </Button>
        </Space>
      </Card>

      {overview && (
        <Card size="small" className="surface-card" title="产品概要产物">
          <MarkdownView markdown={overview} />
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <Space wrap>
              <VersionTimeline stageKey="overview" currentText={overview} />
              <PipelineStageActions
                content={overview}
                stageLabel="产品概要"
                downloadName="产品概要.md"
                onRefined={(refined) => {
                  patch('overview', { overview: refined });
                  saveVersion('overview', '审核优化', refined);
                }}
                onClear={() => reset('overview')}
                nextTargets={[
                  {
                    label: '发送到 ③ 具体需求',
                    to: '/app/tools/requirements',
                    apply: (content) => patch('requirements', { source: content }),
                  },
                ]}
              />
            </Space>
          </div>
        </Card>
      )}
    </StageScaffold>
  );
}
