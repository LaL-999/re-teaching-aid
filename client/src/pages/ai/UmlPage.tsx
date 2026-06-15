import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Input, Popconfirm, Row, Select, Space, Spin, Typography } from 'antd';
import {
  ClearOutlined,
  DownloadOutlined,
  ImportOutlined,
  LinkOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { CopyButton } from '../../components/CopyButton';
import { VersionTimeline } from '../../components/VersionTimeline';
import { saveText } from '../../utils/file';
import { useWorkbench } from '../../store/workbenchStore';
import type { UmlDiagramType } from '../../types';

const DIAGRAM_OPTIONS: Array<{ value: UmlDiagramType; label: string }> = [
  { value: 'usecase', label: '用例图' },
  { value: 'activity', label: '活动图' },
  { value: 'class', label: '类图' },
];

/** ⑥ UML 建模与预览 —— AI 生成 PlantUML 代码并在线编译预览，改码即重编。 */
export function UmlPage() {
  const { message } = App.useApp();
  const description = useWorkbench((s) => s.data.uml.description);
  const diagramType = useWorkbench((s) => s.data.uml.diagramType);
  const code = useWorkbench((s) => s.data.uml.code);
  const optimized = useWorkbench((s) => s.data.review.optimized);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);

  const [svg, setSvg] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [refining, setRefining] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const loadUpstream = (): void => {
    const upstream = optimized.trim() || requirements.trim();
    if (!upstream) {
      message.warning('上游（④ 优化后需求 / ③ 具体需求）尚无内容');
      return;
    }
    patch('uml', { description: upstream });
    message.success('已载入上游需求');
  };

  const handleGenerate = async (): Promise<void> => {
    if (!diagramType) {
      message.error('请选择UML图形类型');
      return;
    }
    setGenerating(true);
    try {
      const result = await aiService.generateUml(description.trim(), diagramType);
      patch('uml', { code: result.code });
      saveVersion('uml', '生成', result.code);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async (): Promise<void> => {
    if (!code.trim()) return;
    setRefining(true);
    try {
      const result = await aiService.refine('UML / PlantUML 代码', code);
      patch('uml', { code: result.refined });
      saveVersion('uml', '审核优化', result.refined);
      message.success(result.mode === 'mock' ? '离线模式未实质改写' : '已审核并优化');
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setRefining(false);
    }
  };

  const handleClear = (): void => {
    reset('uml');
    setSvg('');
    setExternalUrl('');
    setRenderError(null);
  };

  const renderCode = useCallback(async (source: string): Promise<void> => {
    if (!source.trim()) {
      setSvg('');
      setRenderError(null);
      return;
    }
    setRendering(true);
    setRenderError(null);
    try {
      const result = await aiService.renderUml(source);
      setSvg(result.svg);
      setExternalUrl(result.externalUrl);
    } catch (err) {
      setRenderError(getApiErrorMessage(err));
      setSvg('');
    } finally {
      setRendering(false);
    }
  }, []);

  // 改码即重编：防抖 800ms
  useEffect(() => {
    if (!code.trim()) return undefined;
    const timer = window.setTimeout(() => {
      void renderCode(code);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [code, renderCode]);

  const svgDataUrl = svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : '';

  return (
    <StageScaffold
      badge="⑥"
      title="UML 建模与预览"
      subtitle="输入（或从上游载入）系统描述并选择图形类型，AI 生成 PlantUML 代码并在线编译预览；修改或审核优化代码会自动重新编译。"
      navCurrent="uml"
      promptStage="uml"
    >
      <Row gutter={16}>
        <Col xs={24} lg={11}>
          <Card size="small" className="surface-card" title="输入与代码" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Input.TextArea
                value={description}
                onChange={(e) => patch('uml', { description: e.target.value })}
                autoSize={{ minRows: 4, maxRows: 10 }}
                placeholder="如 外卖系统包括学生顾客、商家、骑手，学生可以提交订单、支付订单，商家可以接单，骑手可以配送"
              />
              <Space wrap>
                <Select<UmlDiagramType>
                  value={diagramType || undefined}
                  onChange={(value) => patch('uml', { diagramType: value })}
                  options={DIAGRAM_OPTIONS}
                  placeholder="请选择 UML 图形类型"
                  style={{ width: 160 }}
                />
                <Button type="primary" loading={generating} onClick={handleGenerate}>
                  生成代码
                </Button>
                <Button icon={<ImportOutlined />} onClick={loadUpstream}>
                  从上游载入
                </Button>
              </Space>

              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  PlantUML 代码（可手动修改，自动重新编译）
                </Typography.Text>
                <Input.TextArea
                  value={code}
                  onChange={(e) => patch('uml', { code: e.target.value })}
                  autoSize={{ minRows: 12, maxRows: 22 }}
                  placeholder="生成后将在此显示，可直接编辑…"
                  className="code-block"
                  style={{ marginTop: 6 }}
                />
              </div>

              <Space wrap>
                <CopyButton text={code} label="复制代码" />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => renderCode(code)}
                  disabled={!code.trim()}
                  loading={rendering}
                >
                  重新编译
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={handleRefine}
                  disabled={!code.trim()}
                  loading={refining}
                >
                  审核并优化
                </Button>
                <VersionTimeline stageKey="uml" currentText={code} />
                <Popconfirm
                  title="清空本车间的输入与代码？"
                  okText="清空"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleClear}
                >
                  <Button danger icon={<ClearOutlined />}>
                    清空
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={13}>
          <Card
            size="small"
            className="surface-card"
            title="编译预览"
            extra={
              <Space>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => saveText(svg, 'uml-diagram.svg', 'image/svg+xml')}
                  disabled={!svg}
                >
                  下载 SVG
                </Button>
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  href={externalUrl || undefined}
                  target="_blank"
                  disabled={!externalUrl}
                >
                  新标签打开
                </Button>
              </Space>
            }
          >
            {renderError ? (
              <Alert type="error" showIcon message="编译失败" description={renderError} />
            ) : rendering ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: '#888' }}>编译中…</div>
              </div>
            ) : svgDataUrl ? (
              <div
                style={{
                  textAlign: 'center',
                  overflow: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 200,
                  background: '#fff',
                }}
              >
                <img src={svgDataUrl} alt="UML 图形预览" style={{ maxWidth: '100%' }} />
              </div>
            ) : (
              <Typography.Text type="secondary">生成或输入代码后将在此显示图形预览。</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </StageScaffold>
  );
}
