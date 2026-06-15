import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Empty,
  Modal,
  Popconfirm,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DiffOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
  RollbackOutlined,
  SaveOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useWorkbench, type StageKey } from '../store/workbenchStore';

interface VersionTimelineProps {
  stageKey: StageKey;
  /** 当前工作态的主产物文本：用于「存档当前」与「与当前对比」。 */
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
 * 产物版本树：每次「生成 / 审核优化 / 一键贯通」会自动存为一版；用户也可手动「存档当前」。
 * 支持恢复任意历史版本、与当前对比、标记最佳、删除——便于不断迭代后选出最满意的一版。
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
      message.warning('当前没有可存档的产物');
      return;
    }
    saveVersion(stageKey, '手动存档', currentText);
    message.success('已把当前产物存为一个版本');
  };

  const handleRestore = (id: string): void => {
    restoreVersion(stageKey, id);
    message.success('已恢复到该版本，可继续编辑或重新生成');
  };

  const panel = (
    <div style={{ width: 340, maxHeight: 440, overflow: 'auto' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
        <Space size={4}>
          <Typography.Text strong>产物版本（{versions.length}）</Typography.Text>
          <Tooltip title="每次「生成 / 审核优化 / 一键贯通」会自动存为一版。你可以恢复任意版本、与当前对比、标记最佳，迭代出最满意的一版。">
            <QuestionCircleOutlined style={{ color: '#9aa0b4' }} />
          </Tooltip>
        </Space>
        <Tooltip title="把当前工作态另存为一个新版本">
          <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>
            存档当前
          </Button>
        </Tooltip>
      </Space>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '0 0 10px' }}>
        生成与审核优化会自动存档；点「恢复」可回到任意历史版本。
      </Typography.Paragraph>

      {versions.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史版本" />
      ) : (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {versions.map((version, index) => (
            <div className="version-item" key={version.id}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                <Space size={6} wrap>
                  <Tag color={index === 0 ? 'geekblue' : 'default'} style={{ margin: 0 }}>
                    {index === 0 ? '最新' : `稿 ${versions.length - index}`}
                  </Tag>
                  <Typography.Text style={{ fontSize: 13 }}>{version.label}</Typography.Text>
                  {version.starred && <Tag color="gold" style={{ margin: 0 }}>最佳</Tag>}
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
              <Space size={2} wrap>
                <Popconfirm
                  title="恢复此版本？"
                  description="将用该版本覆盖当前工作态（当前内容若未存档会丢失）。"
                  okText="恢复"
                  cancelText="取消"
                  onConfirm={() => handleRestore(version.id)}
                >
                  <Button size="small" type="link" icon={<RollbackOutlined />} style={{ paddingInline: 4 }}>
                    恢复
                  </Button>
                </Popconfirm>
                <Button
                  size="small"
                  type="link"
                  icon={<DiffOutlined />}
                  style={{ paddingInline: 4 }}
                  onClick={() => setCompareId(version.id)}
                >
                  对比当前
                </Button>
                <Tooltip title={version.starred ? '取消最佳' : '标记为最佳'}>
                  <Button
                    size="small"
                    type="text"
                    icon={
                      version.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />
                    }
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
      <Popover content={panel} trigger="click" placement="bottomRight">
        <Button icon={<HistoryOutlined />}>
          版本{versions.length > 0 ? ` · ${versions.length}` : ''}
        </Button>
      </Popover>

      <Modal
        open={compareTarget !== null}
        title="版本对比 · 当前工作态 vs 选中版本"
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
