import { useState } from 'react';
import { App, Button, Card, Input, Space, Typography } from 'antd';
import { BranchesOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { VersionTimeline } from '../../components/VersionTimeline';
import { useWorkbench } from '../../store/workbenchStore';

/** ⑤ i* 目标建模 —— 由需求生成 piStar 2.0 结构化模型，可一键复制并打开 piStar 工具。 */
export function IstarPage() {
  const { message } = App.useApp();
  const requirement = useWorkbench((s) => s.data.istar.requirement);
  const code = useWorkbench((s) => s.data.istar.code);
  const optimized = useWorkbench((s) => s.data.review.optimized);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [loading, setLoading] = useState(false);

  const loadUpstream = (): void => {
    const upstream = optimized.trim() || requirements.trim();
    if (!upstream) {
      message.warning('上游（④ 优化后需求 / ③ 具体需求）尚无内容');
      return;
    }
    patch('istar', { requirement: upstream });
    message.success('已载入上游需求');
  };

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await aiService.istar(requirement.trim());
      patch('istar', { code: result.code });
      saveVersion('istar', '生成', result.code);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAndOpenPiStar = async (): Promise<void> => {
    if (!code) {
      message.warning('请先生成 i* 代码');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      message.success('JSON 已复制到剪贴板，请在 piStar 中 Load Model 后粘贴使用');
      window.open('https://www.cin.ufpe.br/~jhcp/pistar/tool/#', '_blank', 'noopener');
    } catch {
      message.error('复制失败，请手动复制代码');
    }
  };

  return (
    <StageScaffold
      badge="⑤"
      title="i* 目标建模"
      subtitle="输入（或从上游载入）需求描述，AI 生成 i*（iStar 2.0）目标模型 JSON，可复制后导入 piStar 工具渲染。"
      navCurrent="istar"
      promptStage="istar"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={requirement}
          onChange={(e) => patch('istar', { requirement: e.target.value })}
          autoSize={{ minRows: 4, maxRows: 12 }}
          placeholder="如 顾客希望准时送达，商家希望快速出餐，平台希望利润最大化"
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button
            type="primary"
            size="large"
            icon={<BranchesOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!requirement.trim()}
          >
            生成 i* 模型
          </Button>
          <Button icon={<ImportOutlined />} onClick={loadUpstream}>
            从上游需求载入
          </Button>
        </Space>
      </Card>

      {code && (
        <Card size="small" className="surface-card" title="i* 模型（piStar JSON）">
          <pre className="code-block" style={{ margin: 0, maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', background: '#fafafe', padding: 12, borderRadius: 8 }}>
            {code}
          </pre>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <Space wrap>
              <Button type="primary" icon={<ExportOutlined />} onClick={handleCopyAndOpenPiStar}>
                复制并打开 piStar
              </Button>
              <VersionTimeline stageKey="istar" currentText={code} />
              <PipelineStageActions
                content={code}
                stageLabel="i* 目标模型"
                downloadName="istar-model.json"
                copyLabel="复制 JSON"
                onRefined={(refined) => {
                  patch('istar', { code: refined });
                  saveVersion('istar', '审核优化', refined);
                }}
                onClear={() => reset('istar')}
              />
            </Space>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
              💡 在 piStar 工具中选择「Load Model」，粘贴此 JSON 即可渲染交互式 i* 目标模型图。
            </Typography.Paragraph>
          </div>
        </Card>
      )}
    </StageScaffold>
  );
}
