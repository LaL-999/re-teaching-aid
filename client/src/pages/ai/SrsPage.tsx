import { useState } from 'react';
import { App, Button, Card, Collapse, Input, Space, Tabs, Typography } from 'antd';
import { DownloadOutlined, FileAddOutlined, FileTextOutlined, ImportOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { CopyButton } from '../../components/CopyButton';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { VersionTimeline } from '../../components/VersionTimeline';
import { saveText } from '../../utils/file';
import { useWorkbench } from '../../store/workbenchStore';

/** 取 HTML 文档 <body> 内部，用于把"补充章节"并入主文档。 */
function bodyInner(htmlDoc: string): string {
  const matched = htmlDoc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return matched ? matched[1]! : htmlDoc;
}

function mergeHtml(mainHtml: string, sectionHtml: string): string {
  const section = bodyInner(sectionHtml);
  if (mainHtml.includes('</body>')) {
    return mainHtml.replace('</body>', `\n${section}\n</body>`);
  }
  return mainHtml + section;
}

/**
 * ⑦ SRS 规格说明书 —— 素材驱动：直接由上游「优化后需求 / 具体需求」一键生成，
 * 不再强制手填项目名称与功能点（手填项收进「高级选项」），让 SRS 也能纳入一句话端到端闭环。
 */
export function SrsPage() {
  const { message } = App.useApp();
  const projectName = useWorkbench((s) => s.data.srs.projectName);
  const background = useWorkbench((s) => s.data.srs.background);
  const featuresText = useWorkbench((s) => s.data.srs.featuresText);
  const material = useWorkbench((s) => s.data.srs.material);
  const markdown = useWorkbench((s) => s.data.srs.markdown);
  const html = useWorkbench((s) => s.data.srs.html);
  const optimized = useWorkbench((s) => s.data.review.optimized);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [loading, setLoading] = useState(false);
  const [supplementing, setSupplementing] = useState(false);

  const parseFeatures = (): string[] =>
    featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const loadFromUpstream = (source: 'review' | 'requirements'): void => {
    const content = source === 'review' ? optimized.trim() : requirements.trim();
    if (!content) {
      message.warning(source === 'review' ? '④ 优化后需求尚无内容' : '③ 具体需求尚无内容');
      return;
    }
    patch('srs', { material: content });
    message.success('已载入上游需求素材');
  };

  const canGenerate = material.trim().length > 0 || (projectName.trim() && parseFeatures().length > 0);

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await aiService.srs({
        projectName: projectName.trim(),
        features: parseFeatures(),
        background: background.trim(),
        material: material.trim() || undefined,
      });
      patch('srs', { markdown: data.markdown, html: data.html });
      saveVersion('srs', '生成', data.markdown);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSupplement = async (): Promise<void> => {
    if (!markdown) return;
    setSupplementing(true);
    try {
      const data = await aiService.srs({
        projectName: projectName.trim(),
        features: parseFeatures(),
        background: background.trim(),
        material: material.trim() || undefined,
        supplement: 'nonfunctional',
      });
      const nextMarkdown = `${markdown}\n\n${data.markdown}`;
      patch('srs', { markdown: nextMarkdown, html: mergeHtml(html, data.html) });
      saveVersion('srs', '补充非功能需求', nextMarkdown);
      message.success('已补充非功能需求章节');
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSupplementing(false);
    }
  };

  const fileBase = projectName.trim() || 'SRS';

  return (
    <StageScaffold
      badge="⑦"
      title="SRS 规格说明书"
      subtitle="把上游需求素材一键生成符合 GB/T 9385 的 SRS 初稿（功能需求采用用户故事格式），可导出 Markdown / HTML。无需手填，素材即可成稿。"
      navCurrent="srs"
      promptStage="srs"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Typography.Text strong>需求素材（流水线主入口）</Typography.Text>
            <Input.TextArea
              value={material}
              onChange={(e) => patch('srs', { material: e.target.value })}
              autoSize={{ minRows: 6, maxRows: 16 }}
              placeholder="把上游「优化后需求 / 具体需求」粘贴或一键载入到这里，AI 会自动提炼项目名称、功能点与背景生成 SRS。"
              style={{ marginTop: 6 }}
            />
          </div>
          <Space wrap>
            <Button icon={<ImportOutlined />} onClick={() => loadFromUpstream('review')}>
              从 ④ 优化后需求载入
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => loadFromUpstream('requirements')}>
              从 ③ 具体需求载入
            </Button>
          </Space>

          <Collapse
            ghost
            items={[
              {
                key: 'advanced',
                label: '高级选项（可选）：手动指定项目名称 / 功能点 / 背景',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    <Input
                      value={projectName}
                      onChange={(e) => patch('srs', { projectName: e.target.value })}
                      placeholder="项目名称（留空则由 AI 从素材提炼）"
                      addonBefore="项目名称"
                    />
                    <Input.TextArea
                      value={featuresText}
                      onChange={(e) => patch('srs', { featuresText: e.target.value })}
                      autoSize={{ minRows: 3, maxRows: 8 }}
                      placeholder={'主要功能点，每行一个（留空则由 AI 从素材提炼）'}
                    />
                    <Input.TextArea
                      value={background}
                      onChange={(e) => patch('srs', { background: e.target.value })}
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      placeholder="项目背景（可选）"
                    />
                  </Space>
                ),
              },
            ]}
          />

          <Button
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            生成 SRS
          </Button>
          {loading && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              正在生成…（完整 SRS 篇幅较长，通常需 20–60 秒，请耐心等待）
            </Typography.Text>
          )}
        </Space>
      </Card>

      {markdown && (
        <Card
          size="small"
          className="surface-card"
          title="SRS 初稿"
          extra={
            <Space wrap>
              <VersionTimeline stageKey="srs" currentText={markdown} />
              <Button icon={<FileAddOutlined />} onClick={handleSupplement} loading={supplementing}>
                补充非功能需求
              </Button>
              <CopyButton text={markdown} label="复制 Markdown" />
              <Button
                icon={<DownloadOutlined />}
                onClick={() => saveText(markdown, `${fileBase}.md`, 'text/markdown;charset=utf-8')}
              >
                下载 MD
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => saveText(html, `${fileBase}.html`, 'text/html;charset=utf-8')}
              >
                下载 HTML
              </Button>
            </Space>
          }
        >
          <Tabs
            items={[
              {
                key: 'preview',
                label: '排版预览',
                children: (
                  <iframe
                    title="SRS 排版预览"
                    srcDoc={html}
                    sandbox=""
                    style={{ width: '100%', height: '60vh', border: '1px solid #f0f0f0', borderRadius: 8 }}
                  />
                ),
              },
              {
                key: 'markdown',
                label: 'Markdown 源码',
                children: (
                  <pre
                    className="code-block"
                    style={{
                      margin: 0,
                      maxHeight: '60vh',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      background: '#fafafe',
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    {markdown}
                  </pre>
                ),
              },
            ]}
          />
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <PipelineStageActions
              content={markdown}
              stageLabel="SRS 文档"
              downloadName={`${fileBase}.md`}
              copyLabel="复制 Markdown"
              onRefined={(refined) => {
                patch('srs', { markdown: refined });
                saveVersion('srs', '审核优化', refined);
              }}
              onClear={() => reset('srs')}
              nextTargets={[
                {
                  label: '发送到 ⑧ 需求追踪',
                  to: '/app/tools/trace',
                  apply: (content) => patch('trace', { srs: content }),
                },
              ]}
            />
          </div>
        </Card>
      )}
    </StageScaffold>
  );
}
