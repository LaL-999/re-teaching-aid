import { useMemo, useState } from 'react';
import { App, Button, Empty, Modal, Popconfirm, Popover, Space, Tag, Tooltip, Typography } from 'antd';
import {
  DeleteOutlined,
  DiffOutlined,
  HistoryOutlined,
  RollbackOutlined,
  SaveOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useWorkbench, type StageKey } from '../store/workbenchStore';

interface VersionTimelineProps {
  stageKey: StageKey;
  /** 当前工作态的主产物文本：用于「存为当前版本」与「与当前对比」。 */
  currentText: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 产物版本树：把每个车间的历次产物存成版本，支持回滚、标记最佳、删除、与当前对比。
 * 让老师能不断迭代、最终选出效果最好的一版。
 */
export function VersionTimeline({ stageKey, currentText }: VersionTimelineProps) {
  const { message } = App.useApp();
  const versions = useWorkbench((s) => s.versions[stageKey]);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const restoreVersion = useWorkbench((s) => s.restoreVersion);
  const toggleStar = useWorkbench((s) => s.toggleStar);
  const deleteVersion = useWorkbench((s) => s.deleteVersion);
  const [compareId, setCompareId] = useState<string | null>(null);

  const compareTarget = useMemo(
    () => versions.find((v) => v.id === compareId) ?? null,
    [versions, compareId],
  );

  const handleSave = (): void => {
    if (!currentText.trim()) {
      message.warning('当前没有可保存的产物');
      return;
    }
    saveVersion(stageKey, '手动存档', currentText);
    message.success('已存为新版本');
  };

  const handleRestore = (id: string): void => {
    restoreVersion(stageKey, id);
    message.success('已回滚到该版本');
  };

  const panel = (
    <div style={{ width: 320, maxHeight: 420, overflow: 'auto' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
        <Typography.Text strong>产物版本（{versions.length}）</Typography.Text>
        <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>
          存为当前
        </Button>
      </Space>
      {versions.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无历史版本，生成或存档后在此查看"
        />
      ) : (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {versions.map((version, index) => (
            <div className="version-item" key={version.id}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                <Space size={6} wrap>
                  <Tag color={index === 0 ? 'geekblue' : 'default'}>
                    {index === 0 ? '最新' : `稿 ${versions.length - index}`}
                  </Tag>
                  <Typography.Text style={{ fontSize: 13 }}>{version.label}</Typography.Text>
                  {version.starred && <Tag color="gold">最佳</Tag>}
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {formatTime(version.createdAt)}
                </Typography.Text>
              </Space>
              <Typography.Paragraph
                type="secondary"
                ellipsis={{ rows: 2 }}
                style={{ fontSize: 12, margin: '6px 0' }}
              >
                {version.text || '（无文本预览）'}
              </Typography.Paragraph>
              <Space size={4} wrap>
                <Button
                  size="small"
                  type="text"
                  icon={<RollbackOutlined />}
                  onClick={() => handleRestore(version.id)}
                >
                  回滚
                </Button>
                <Button
                  size="small"
                  type="text"
                  icon={<DiffOutlined />}
                  onClick={() => setCompareId(version.id)}
                >
                  对比
                </Button>
                <Tooltip title={version.starred ? '取消最佳' : '标记为最佳'}>
                  <Button
                    size="small"
                    type="text"
                    icon={version.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={() => toggleStar(stageKey, version.id)}
                  />
                </Tooltip>
                <Popconfirm
                  title="删除该版本？"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteVersion(stageKey, version.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </Space>
      )}
    </div>
  );

  return (
    <>
      <Popover content={panel} title={null} trigger="click" placement="bottomRight">
        <Button icon={<HistoryOutlined />}>
          版本{versions.length > 0 ? ` · ${versions.length}` : ''}
        </Button>
      </Popover>

      <Modal
        open={compareTarget !== null}
        title="版本对比 · 当前 vs 选中版本"
        width={920}
        footer={null}
        onCancel={() => setCompareId(null)}
        destroyOnHidden
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Typography.Text strong>当前工作态</Typography.Text>
            <pre className="code-block" style={compareBoxStyle}>
              {currentText || '（空）'}
            </pre>
          </div>
          <div>
            <Typography.Text strong>{compareTarget?.label ?? '选中版本'}</Typography.Text>
            <pre className="code-block" style={compareBoxStyle}>
              {compareTarget?.text || '（空）'}
            </pre>
          </div>
        </div>
      </Modal>
    </>
  );
}

const compareBoxStyle: React.CSSProperties = {
  marginTop: 8,
  maxHeight: '60vh',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  background: '#fafafe',
  border: '1px solid #eceef5',
  padding: 12,
  borderRadius: 8,
};
