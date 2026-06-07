import { useState } from 'react';
import { App, Button, Card, Input, Space, Typography } from 'antd';
import { ImportOutlined, ExportOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { AiModeBanner } from '../../components/AiModeBanner';
import { PipelineNav } from '../../components/PipelineNav';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { useWorkbench } from '../../store/workbenchStore';

export function IstarPage() {
  const { message } = App.useApp();
  const requirement = useWorkbench((s) => s.data.istar.requirement);
  const code = useWorkbench((s) => s.data.istar.code);
  const optimized = useWorkbench((s) => s.data.review.optimized);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
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
    } catch (err) {
      // 过简 → 「需求描述过于简单，请补充更多细节」；失败 → 「生成失败，请检查网络或稍后重试」
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
      message.success('JSON 已复制到剪贴板！请在弹出的 piStar 页面中使用快捷键 Ctrl+V 粘贴，或点击 Load Model 后粘贴文件内容');
      window.open('https://www.cin.ufpe.br/~jhcp/pistar/tool/#', '_blank');
    } catch {
      message.error('复制失败，请手动复制代码');
    }
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        ⑤ i* 目标建模
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        输入（或从上游载入）需求描述，AI 生成 i*（iStar）目标模型代码，可复制、下载或审核优化。
      </Typography.Paragraph>

      <PipelineNav current="istar" />
      <AiModeBanner />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={requirement}
          onChange={(e) => patch('istar', { requirement: e.target.value })}
          rows={4}
          placeholder="如 顾客希望准时送达，商家希望快速出餐，平台希望利润最大化"
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button type="primary" size="large" loading={loading} onClick={handleGenerate}>
            生成 i* 代码
          </Button>
          <Button icon={<ImportOutlined />} onClick={loadUpstream}>
            从上游需求载入
          </Button>
        </Space>
      </Card>

      {code && (
        <Card size="small" title="i* 模型代码">
          <pre className="code-block" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {code}
          </pre>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <Space wrap>
              <Button type="primary" icon={<ExportOutlined />} onClick={handleCopyAndOpenPiStar}>
                复制并打开 piStar
              </Button>
            </Space>
            <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
              <Typography.Text type="secondary">
                💡 使用方法：点击上方按钮 → 在 piStar 页面的浏览器控制台（F12）中执行：
                <br />
                <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                  localStorage.setItem('istar-model', navigator.clipboard.readText())
                </code>
                <br />
                然后刷新 piStar 页面，模型会自动加载。
                <br />
                或者：复制代码 → 手动保存为 .txt 文件 → 在 piStar 中 Load Model
              </Typography.Text>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <PipelineStageActions
              content={code}
              stageLabel="i* 目标模型代码"
              downloadName="istar-model.txt"
              copyLabel="复制代码"
              onRefined={(refined) => patch('istar', { code: refined })}
              onClear={() => reset('istar')}
            />
          </div>
        </Card>
      )}
    </>
  );
}
