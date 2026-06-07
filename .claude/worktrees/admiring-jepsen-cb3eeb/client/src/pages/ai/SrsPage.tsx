import { useState } from 'react';
import { App, Button, Card, Input, Popconfirm, Space, Tabs, Typography } from 'antd';
import { ClearOutlined, DownloadOutlined, FileAddOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { AiModeBanner } from '../../components/AiModeBanner';
import { PipelineNav } from '../../components/PipelineNav';
import { CopyButton } from '../../components/CopyButton';
import { saveText } from '../../utils/file';
import { useWorkbench } from '../../store/workbenchStore';

/** 取 HTML 文档 <body> 内部，用于把“补充章节”并入主文档。 */
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

export function SrsPage() {
  const { message } = App.useApp();
  const projectName = useWorkbench((s) => s.data.srs.projectName);
  const background = useWorkbench((s) => s.data.srs.background);
  const featuresText = useWorkbench((s) => s.data.srs.featuresText);
  const material = useWorkbench((s) => s.data.srs.material);
  const markdown = useWorkbench((s) => s.data.srs.markdown);
  const html = useWorkbench((s) => s.data.srs.html);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const [loading, setLoading] = useState(false);
  const [supplementing, setSupplementing] = useState(false);

  const parseFeatures = (): string[] =>
    featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

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
    } catch (err) {
      // 缺少名称或功能点 → 「请填写项目名称和至少一个功能点」
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSupplement = async (): Promise<void> => {
    if (!markdown) {
      return;
    }
    setSupplementing(true);
    try {
      const data = await aiService.srs({
        projectName: projectName.trim(),
        features: parseFeatures(),
        background: background.trim(),
        material: material.trim() || undefined,
        supplement: 'nonfunctional',
      });
      patch('srs', {
        markdown: `${markdown}\n\n${data.markdown}`,
        html: mergeHtml(html, data.html),
      });
      message.success('已补充非功能需求章节');
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSupplementing(false);
    }
  };

  const fileBase = projectName.trim() || 'SRS';

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        ⑦ SRS 规格说明书
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        填写项目名称与功能点（可附上游需求素材），AI 按 GB/T 9385 结构生成 SRS 初稿（功能需求采用用户故事格式），可导出 Markdown / HTML。
      </Typography.Paragraph>

      <PipelineNav current="srs" />
      <AiModeBanner />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Input
            value={projectName}
            onChange={(e) => patch('srs', { projectName: e.target.value })}
            placeholder="项目名称，如 校园外卖系统"
            addonBefore="项目名称"
          />
          <Input.TextArea
            value={featuresText}
            onChange={(e) => patch('srs', { featuresText: e.target.value })}
            rows={5}
            placeholder={'主要功能点，每行一个，如：\n用户注册登录\n浏览商家\n提交订单\n支付订单\n订单跟踪'}
          />
          <Input.TextArea
            value={background}
            onChange={(e) => patch('srs', { background: e.target.value })}
            rows={2}
            placeholder="项目背景（可选）"
          />
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              上游需求素材（可选，来自「④ 需求分析与审查」的发送）
            </Typography.Text>
            <Input.TextArea
              value={material}
              onChange={(e) => patch('srs', { material: e.target.value })}
              rows={3}
              placeholder="可留空；若由上游发送，则作为生成 SRS 的额外依据。"
              style={{ marginTop: 6 }}
            />
          </div>
          <Button type="primary" size="large" loading={loading} onClick={handleGenerate}>
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
          title="SRS 初稿"
          extra={
            <Space wrap>
              <Button icon={<FileAddOutlined />} onClick={handleSupplement} loading={supplementing}>
                补充非功能需求
              </Button>
              <CopyButton text={markdown} label="复制 Markdown" />
              <Button
                icon={<DownloadOutlined />}
                onClick={() => saveText(markdown, `${fileBase}.md`, 'text/markdown;charset=utf-8')}
              >
                下载 Markdown
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => saveText(html, `${fileBase}.html`, 'text/html;charset=utf-8')}
              >
                下载 HTML
              </Button>
              <Popconfirm
                title="清空本车间的输入与产物？"
                okText="清空"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => reset('srs')}
              >
                <Button danger icon={<ClearOutlined />}>
                  清空
                </Button>
              </Popconfirm>
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
                    style={{
                      width: '100%',
                      height: '60vh',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                    }}
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
                      background: '#fafafa',
                      padding: 12,
                      borderRadius: 6,
                    }}
                  >
                    {markdown}
                  </pre>
                ),
              },
            ]}
          />
        </Card>
      )}
    </>
  );
}
