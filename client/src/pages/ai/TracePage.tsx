import { useState } from 'react';
import { Alert, App, Button, Card, Empty, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeploymentUnitOutlined, DownloadOutlined, ImportOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { VersionTimeline } from '../../components/VersionTimeline';
import { saveText } from '../../utils/file';
import { useWorkbench } from '../../store/workbenchStore';
import type { TraceLink } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  已覆盖: 'green',
  部分覆盖: 'orange',
  未覆盖: 'red',
};

const columns: ColumnsType<TraceLink> = [
  { title: '编号', dataIndex: 'reqId', key: 'reqId', width: 90, render: (v: string) => v || '—' },
  { title: '需求条目', dataIndex: 'requirement', key: 'requirement' },
  { title: 'SRS 章节', dataIndex: 'srsRef', key: 'srsRef', width: 180, render: (v: string) => v || '—' },
  { title: '系统组件', dataIndex: 'component', key: 'component', width: 160, render: (v: string) => v || '—' },
  {
    title: '覆盖状态',
    dataIndex: 'status',
    key: 'status',
    width: 110,
    render: (status: string) => <Tag color={STATUS_COLOR[status] ?? 'default'}>{status || '未知'}</Tag>,
  },
];

function linksToText(links: TraceLink[]): string {
  return links
    .map((l) => `${l.reqId}\t${l.requirement}\t${l.srsRef}\t${l.component}\t${l.status}`)
    .join('\n');
}

function linksToCsv(links: TraceLink[]): string {
  const head = '编号,需求条目,SRS章节,系统组件,覆盖状态';
  const esc = (s: string): string => `"${(s ?? '').replace(/"/g, '""')}"`;
  const rows = links.map((l) =>
    [l.reqId, l.requirement, l.srsRef, l.component, l.status].map(esc).join(','),
  );
  // 前置 UTF-8 BOM + CRLF：避免中文在 Excel 中乱码（RFC 4180 / Windows 友好）
  return `﻿${[head, ...rows].join('\r\n')}`;
}

/** ⑧ 需求追踪矩阵 —— 把具体需求与 SRS 对应起来，建立「需求 ↔ 系统」追踪链，覆盖性一目了然。 */
export function TracePage() {
  const { message } = App.useApp();
  const reqText = useWorkbench((s) => s.data.trace.requirements);
  const srsText = useWorkbench((s) => s.data.trace.srs);
  const links = useWorkbench((s) => s.data.trace.links);
  const summary = useWorkbench((s) => s.data.trace.summary);
  const upstreamReq = useWorkbench((s) => s.data.review.optimized);
  const upstreamReq2 = useWorkbench((s) => s.data.requirements.requirements);
  const upstreamSrs = useWorkbench((s) => s.data.srs.markdown);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [loading, setLoading] = useState(false);

  const loadReq = (): void => {
    const content = upstreamReq.trim() || upstreamReq2.trim();
    if (!content) {
      message.warning('上游（④ 优化后需求 / ③ 具体需求）尚无内容');
      return;
    }
    patch('trace', { requirements: content });
    message.success('已载入需求');
  };

  const loadSrs = (): void => {
    if (!upstreamSrs.trim()) {
      message.warning('⑦ SRS 尚未生成');
      return;
    }
    patch('trace', { srs: upstreamSrs });
    message.success('已载入 SRS');
  };

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await aiService.trace(reqText.trim(), srsText.trim());
      patch('trace', { links: data.links, summary: data.summary });
      if (data.links.length > 0) {
        saveVersion('trace', '生成', linksToText(data.links));
      }
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const covered = links.filter((l) => l.status === '已覆盖').length;

  return (
    <StageScaffold
      badge="⑧"
      title="需求追踪矩阵"
      subtitle="把「具体需求」与「SRS 文档」逐条对应，建立需求 ↔ 系统的双向追踪链，直观呈现每条需求由哪个系统组件实现、覆盖情况如何。"
      navCurrent="trace"
      promptStage="trace"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text strong>需求（来自 ③/④）</Typography.Text>
              <Button size="small" icon={<ImportOutlined />} onClick={loadReq}>
                从上游需求载入
              </Button>
            </Space>
            <Input.TextArea
              value={reqText}
              onChange={(e) => patch('trace', { requirements: e.target.value })}
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder="粘贴具体需求 / 优化后需求；或点击右上角一键载入。"
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text strong>SRS 文档（来自 ⑦）</Typography.Text>
              <Button size="small" icon={<ImportOutlined />} onClick={loadSrs}>
                从 ⑦ SRS 载入
              </Button>
            </Space>
            <Input.TextArea
              value={srsText}
              onChange={(e) => patch('trace', { srs: e.target.value })}
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder="粘贴 SRS 文档；或点击右上角一键载入。"
              style={{ marginTop: 6 }}
            />
          </div>
          <Button
            type="primary"
            size="large"
            icon={<DeploymentUnitOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!reqText.trim() || !srsText.trim()}
          >
            生成追踪矩阵
          </Button>
        </Space>
      </Card>

      {(links.length > 0 || summary) && (
        <Card
          size="small"
          className="surface-card"
          title="需求 ↔ 系统 追踪矩阵"
          extra={
            <Space wrap>
              <VersionTimeline stageKey="trace" currentText={linksToText(links)} />
              <Button
                icon={<DownloadOutlined />}
                disabled={links.length === 0}
                onClick={() => saveText(linksToCsv(links), '需求追踪矩阵.csv', 'text/csv;charset=utf-8')}
              >
                导出 CSV
              </Button>
              <Button size="small" danger onClick={() => reset('trace')}>
                清空
              </Button>
            </Space>
          }
        >
          {summary && (
            <Alert
              type="info"
              showIcon
              message={summary}
              description={links.length > 0 ? `共 ${links.length} 条需求，其中已覆盖 ${covered} 条。` : undefined}
              style={{ marginBottom: 16 }}
            />
          )}
          {links.length > 0 ? (
            <Table<TraceLink>
              rowKey={(record, index) => `${record.reqId}-${index}`}
              columns={columns}
              dataSource={links}
              pagination={false}
              size="small"
              scroll={{ x: 720 }}
            />
          ) : (
            <Empty description="暂无追踪结果" />
          )}
        </Card>
      )}
    </StageScaffold>
  );
}
