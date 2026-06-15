import { useState } from 'react';
import { App, Button, Card, Col, Input, Row, Space, Steps, Tag, Typography } from 'antd';
import { ArrowRightOutlined, RocketOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { PIPELINE_STAGES } from '../../pipeline';
import { stageHasOutput, useWorkbench, type StageKey, type WorkbenchData } from '../../store/workbenchStore';

function previewOf(data: WorkbenchData, key: StageKey): string {
  switch (key) {
    case 'overview':
      return data.overview.overview;
    case 'interview':
      return data.interview.questions.join('　/　');
    case 'requirements':
      return data.requirements.requirements;
    case 'review':
      return data.review.optimized || data.review.summary;
    case 'istar':
      return data.istar.code;
    case 'uml':
      return data.uml.code;
    case 'srs':
      return data.srs.markdown;
    case 'trace':
      return data.trace.summary || (data.trace.links.length ? `${data.trace.links.length} 条追踪链` : '');
    default:
      return '';
  }
}

/**
 * 流水线驾驶舱 —— 整条需求工程流水线的总览与起点。
 * 「一句话直达」：输入一句话想法，一键自动贯通 ①产品概要 → ③具体需求 → ④需求分析与审查，
 * 让"想法很好"真正变成"用起来惊艳"的端到端体验；下方总览各车间状态，一眼掌握全局。
 */
export function PipelineCockpitPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const data = useWorkbench((s) => s.data);
  const idea = useWorkbench((s) => s.data.overview.idea);
  const patch = useWorkbench((s) => s.patch);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [failedStep, setFailedStep] = useState(-1);

  const runChain = async (): Promise<void> => {
    if (!idea.trim()) {
      message.warning('请先输入一句话产品想法');
      return;
    }
    setRunning(true);
    setStep(0);
    setFailedStep(-1);
    // 局部进度计数，避免在 catch 中读到 setState 的陈旧闭包值
    let done = 0;
    try {
      // ① 产品概要
      const ov = await aiService.overview(idea.trim());
      patch('overview', { overview: ov.overview });
      saveVersion('overview', '一键贯通', ov.overview);
      done = 1;
      setStep(1);

      // ② 访谈提纲（以一句话想法为领域，产出访谈问题作为需求获取辅助）
      const iv = await aiService.interview(idea.trim());
      patch('interview', { domain: idea.trim(), questions: iv.questions });
      if (iv.questions.length > 0) {
        saveVersion('interview', '一键贯通', iv.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
      }
      done = 2;
      setStep(2);

      // ③ 具体需求（基于产品概要）
      const rq = await aiService.requirements(ov.overview);
      patch('requirements', { source: ov.overview, requirements: rq.requirements });
      saveVersion('requirements', '一键贯通', rq.requirements);
      done = 3;
      setStep(3);

      // ④ 需求分析与审查
      const rv = await aiService.review(rq.requirements);
      patch('review', {
        text: rq.requirements,
        issues: rv.issues,
        summary: rv.summary,
        optimized: rv.optimized,
      });
      if (rv.optimized.trim()) saveVersion('review', '一键贯通', rv.optimized);
      done = 4;
      setStep(4);

      message.success('已贯通 ① → ② → ③ → ④，可继续生成 ⑤ i* / ⑥ UML / ⑦ SRS / ⑧ 追踪');
    } catch (err) {
      // done = 当前正在执行（失败）的步骤下标
      setFailedStep(done);
      message.error(getApiErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const stepStatus = (i: number): 'wait' | 'process' | 'finish' | 'error' => {
    if (i === failedStep) return 'error';
    if (i < step) return 'finish';
    if (i === step && running) return 'process';
    return 'wait';
  };

  const doneCount = PIPELINE_STAGES.filter((s) => stageHasOutput(data, s.key as StageKey)).length;

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <span className="stage-badge">
          <RocketOutlined />
        </span>
        <div style={{ flex: 1 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            流水线驾驶舱
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            一句话直达：从一句话想法自动贯通「概要 → 访谈提纲 → 具体需求 → 分析审查」，再按需推进建模与规格。当前已完成 {doneCount} / {PIPELINE_STAGES.length} 个车间。
          </Typography.Paragraph>
        </div>
      </div>

      <Card
        className="surface-card"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #eef0ff 0%, #f5f0ff 100%)',
          border: '1px solid #e6e8ff',
        }}
      >
        <Typography.Text strong style={{ fontSize: 15 }}>
          <ThunderboltOutlined style={{ color: '#6366f1' }} /> 一句话直达流水线
        </Typography.Text>
        <Input.TextArea
          value={idea}
          onChange={(e) => patch('overview', { idea: e.target.value })}
          autoSize={{ minRows: 2, maxRows: 5 }}
          placeholder="用一句话描述你的产品想法，如：一个面向校园的二手书在线交易与自提平台"
          style={{ margin: '12px 0' }}
          disabled={running}
        />
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          loading={running}
          onClick={runChain}
          disabled={!idea.trim()}
        >
          一键贯通 ① → ② → ③ → ④
        </Button>
        {(running || step > 0 || failedStep >= 0) && (
          <Steps
            size="small"
            current={step}
            style={{ marginTop: 18 }}
            items={['产品概要', '访谈提纲', '具体需求', '需求分析与审查'].map((title, i) => ({
              title,
              status: stepStatus(i),
            }))}
          />
        )}
      </Card>

      <Typography.Title level={5} style={{ marginTop: 8 }}>
        各车间状态
      </Typography.Title>
      <Row gutter={[16, 16]}>
        {PIPELINE_STAGES.map((stage) => {
          const done = stageHasOutput(data, stage.key as StageKey);
          const preview = previewOf(data, stage.key as StageKey);
          return (
            <Col xs={24} sm={12} xl={8} key={stage.key}>
              <Card
                size="small"
                hoverable
                className="surface-card"
                style={{ height: '100%' }}
                onClick={() => navigate(stage.to)}
              >
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Typography.Text strong>
                    {stage.num} {stage.label}
                  </Typography.Text>
                  {done ? <Tag color="green">已产出</Tag> : <Tag>待生成</Tag>}
                </Space>
                <Typography.Paragraph
                  type="secondary"
                  ellipsis={{ rows: 2 }}
                  style={{ fontSize: 12, margin: '8px 0 4px', minHeight: 36 }}
                >
                  {preview || '尚未生成内容'}
                </Typography.Paragraph>
                <Button type="link" size="small" style={{ padding: 0 }}>
                  进入 <ArrowRightOutlined />
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
