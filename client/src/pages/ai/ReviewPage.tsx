import { useState } from 'react';
import { Alert, App, Button, Card, Empty, Input, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AuditOutlined, ImportOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { PipelineStageActions } from '../../components/PipelineStageActions';
import { MarkdownView } from '../../components/MarkdownView';
import { VersionTimeline } from '../../components/VersionTimeline';
import { useWorkbench } from '../../store/workbenchStore';
import type { QualityIssue } from '../../types';

const columns: ColumnsType<QualityIssue> = [
  {
    title: '问题词',
    dataIndex: 'word',
    key: 'word',
    width: 120,
    render: (word: string) => <Tag color="volcano">{word}</Tag>,
  },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => <Tag>{t}</Tag> },
  { title: '问题说明', dataIndex: 'reason', key: 'reason' },
  { title: '改进建议', dataIndex: 'suggestion', key: 'suggestion' },
];

/** ④ 需求分析与审查 —— 检出模糊/矛盾/缺失 + 产出优化后需求，可分发至 i* 与 UML、SRS、追踪。 */
export function ReviewPage() {
  const { message } = App.useApp();
  const text = useWorkbench((s) => s.data.review.text);
  const issues = useWorkbench((s) => s.data.review.issues);
  const summary = useWorkbench((s) => s.data.review.summary);
  const optimized = useWorkbench((s) => s.data.review.optimized);
  const requirements = useWorkbench((s) => s.data.requirements.requirements);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const loadFromRequirements = (): void => {
    if (!requirements.trim()) {
      message.warning('③ 具体需求尚未生成');
      return;
    }
    patch('review', { text: requirements });
    message.success('已载入具体需求');
  };

  const handleReview = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await aiService.review(text.trim());
      patch('review', { issues: data.issues, summary: data.summary, optimized: data.optimized });
      setChecked(true);
      if (data.optimized.trim()) {
        saveVersion('review', '审查', data.optimized);
      }
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const hasResult = checked || issues.length > 0 || Boolean(summary) || Boolean(optimized);

  return (
    <StageScaffold
      badge="④"
      title="需求分析与审查"
      subtitle="检测需求中的模糊词、主观表述、矛盾与缺失，并产出「优化后需求」，可将优化结果分发到 i* / UML / SRS / 追踪等下游车间。"
      navCurrent="review"
      promptStage="review"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Input.TextArea
          value={text}
          onChange={(e) => patch('review', { text: e.target.value })}
          autoSize={{ minRows: 6, maxRows: 16 }}
          placeholder="粘贴需求文本；也可点击「从 ③ 具体需求载入」。如：系统响应要快，操作要方便"
        />
        <Space style={{ marginTop: 12 }} wrap>
          <Button
            type="primary"
            size="large"
            icon={<AuditOutlined />}
            loading={loading}
            onClick={handleReview}
            disabled={!text.trim()}
          >
            分析与审查
          </Button>
          <Button icon={<ImportOutlined />} onClick={loadFromRequirements}>
            从 ③ 具体需求载入
          </Button>
        </Space>
      </Card>

      {hasResult && (
        <>
          <Card size="small" className="surface-card" title="问题清单" style={{ marginBottom: 16 }}>
            <Alert
              type={issues.length > 0 ? 'warning' : 'success'}
              showIcon
              message={summary || '审查完成'}
              style={{ marginBottom: 16 }}
            />
            {issues.length > 0 ? (
              <Table<QualityIssue>
                rowKey={(record, index) => `${record.word}-${index}`}
                columns={columns}
                dataSource={issues}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="未检测到常见模糊 / 主观表述" />
            )}
          </Card>

          {optimized && (
            <Card size="small" className="surface-card" title="优化后需求">
              <MarkdownView markdown={optimized} />
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                <Space wrap>
                  <VersionTimeline stageKey="review" currentText={optimized} />
                  <PipelineStageActions
                    content={optimized}
                    stageLabel="优化后需求"
                    downloadName="优化后需求.md"
                    showRefine={false}
                    onRefined={(refined) => patch('review', { optimized: refined })}
                    onClear={() => reset('review')}
                    nextTargets={[
                      {
                        label: '发送到 ⑤ i*',
                        to: '/app/tools/istar',
                        apply: (content) => patch('istar', { requirement: content }),
                      },
                      {
                        label: '发送到 ⑥ UML',
                        to: '/app/tools/uml',
                        apply: (content) => patch('uml', { description: content }),
                      },
                      {
                        label: '发送到 ⑦ SRS',
                        to: '/app/tools/srs',
                        apply: (content) => patch('srs', { material: content }),
                      },
                      {
                        label: '发送到 ⑧ 追踪',
                        to: '/app/tools/trace',
                        apply: (content) => patch('trace', { requirements: content }),
                      },
                    ]}
                  />
                </Space>
              </div>
            </Card>
          )}
        </>
      )}
    </StageScaffold>
  );
}
