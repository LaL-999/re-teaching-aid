import { useState } from 'react';
import { App, Button, Popconfirm, Space } from 'antd';
import {
  ArrowRightOutlined,
  ClearOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { getApiErrorMessage } from '../services/http';
import { CopyButton } from './CopyButton';
import { saveText } from '../utils/file';

export interface NextTarget {
  /** 按钮文案，如「发送到 ③ 具体需求」 */
  label: string;
  /** 目标车间路由 */
  to: string;
  /** 把当前产物写入下游车间的输入 */
  apply: (content: string) => void;
}

interface PipelineStageActionsProps {
  /** 当前车间产物文本 */
  content: string;
  /** 车间名（用于审核优化提示与默认下载名） */
  stageLabel: string;
  /** 下载文件名 */
  downloadName: string;
  /** 应用「审核并优化」后的新内容 */
  onRefined: (refined: string) => void;
  /** 清空本车间 */
  onClear: () => void;
  /** 流转到下游车间（可多个） */
  nextTargets?: NextTarget[];
  /** 是否显示「审核并优化」，默认显示 */
  showRefine?: boolean;
  copyLabel?: string;
}

/**
 * 流水线车间产物的统一操作区：复制 / 下载 / 审核并优化 / 发送到下游车间 / 清空。
 * 把「数据流转」「每阶段自带优化」「可手动清空」三件事收敛到一处复用。
 */
export function PipelineStageActions({
  content,
  stageLabel,
  downloadName,
  onRefined,
  onClear,
  nextTargets = [],
  showRefine = true,
  copyLabel = '复制',
}: PipelineStageActionsProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [refining, setRefining] = useState(false);

  const handleRefine = async (): Promise<void> => {
    setRefining(true);
    try {
      const result = await aiService.refine(stageLabel, content);
      onRefined(result.refined);
      if (result.mode === 'mock') {
        message.info('离线模式下未实质改写内容；接入真实大模型可获得审核优化。');
      } else {
        message.success('已审核并优化');
      }
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setRefining(false);
    }
  };

  const handleSend = (target: NextTarget): void => {
    target.apply(content);
    message.success(`已${target.label}`);
    navigate(target.to);
  };

  return (
    <Space wrap>
      <CopyButton text={content} label={copyLabel} />
      <Button icon={<DownloadOutlined />} onClick={() => saveText(content, downloadName, downloadName.endsWith('.json') ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8')}>
        下载
      </Button>
      {showRefine && (
        <Button icon={<ThunderboltOutlined />} loading={refining} onClick={handleRefine}>
          审核并优化
        </Button>
      )}
      {nextTargets.map((target) => (
        <Button
          key={target.to}
          type="primary"
          ghost
          icon={<ArrowRightOutlined />}
          onClick={() => handleSend(target)}
        >
          {target.label}
        </Button>
      ))}
      <Popconfirm
        title="清空本车间的输入与产物？"
        okText="清空"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={onClear}
      >
        <Button danger icon={<ClearOutlined />}>
          清空
        </Button>
      </Popconfirm>
    </Space>
  );
}
