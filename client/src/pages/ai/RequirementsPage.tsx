import { useState } from 'react';
import { App, Button, Card, Input, Space } from 'antd';
import { ImportOutlined, OrderedListOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { MarkdownView } from '../../components/MarkdownView';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { VersionTimeline } from '../../components/VersionTimeline';
import { useWorkbench } from '../../store/workbenchStore';

/** ③ 具体需求 —— 基于产品概要拆分功能模块、用户故事与验收标准。 */
export function RequirementsPage() {
  const { message } = App.useApp();
  const source = useWorkbench((s) => s.data.requirements.source);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const overview = useWorkbench((s) => s.data.overview.overview);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
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
      saveVersion('requirements', '生成', result.requirements);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StageScaffold
      badge="③"
      title="具体需求"
      subtitle="基于产品概要或需求素材，AI 拆分功能模块并以用户故事 + 验收标准的形式产出具体功能需求，供「需求分析与审查」进一步打磨。"
      navCurrent="requirements"
      promptStage="requirements"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={source}
          onChange={(e) => patch('requirements', { source: e.target.value })}
          autoSize={{ minRows: 6, maxRows: 16 }}
          placeholder="粘贴产品概要或需求素材；也可点击「从 ① 产品概要载入」。"
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button
            type="primary"
            size="large"
            icon={<OrderedListOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!source.trim()}
          >
            生成具体需求
          </Button>
          <Button icon={<ImportOutlined />} onClick={loadFromOverview}>
            从 ① 产品概要载入
          </Button>
        </Space>
      </Card>

      {requirements && (
        <Card size="small" className="surface-card" title="具体功能需求">
          <MarkdownView markdown={requirements} />
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <Space wrap>
              <VersionTimeline stageKey="requirements" currentText={requirements} />
              <PipelineStageActions
                content={requirements}
                stageLabel="具体需求"
                downloadName="具体需求.md"
                onRefined={(refined) => {
                  patch('requirements', { requirements: refined });
                  saveVersion('requirements', '审核优化', refined);
                }}
                onClear={() => reset('requirements')}
                nextTargets={[
                  {
                    label: '发送到 ④ 需求分析与审查',
                    to: '/app/tools/review',
                    apply: (content) => patch('review', { text: content }),
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
