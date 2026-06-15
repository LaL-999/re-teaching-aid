import { useState, type ReactNode } from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { SlidersOutlined } from '@ant-design/icons';
import { PipelineNav } from './PipelineNav';
import { AiModeBanner } from './AiModeBanner';
import { PromptEditDrawer } from './PromptEditDrawer';
import type { PromptStageKey } from '../types';

interface StageScaffoldProps {
  /** 序号符或图标，如 ① */
  badge: ReactNode;
  title: string;
  subtitle: string;
  /** 流水线轨道高亮的当前阶段 key */
  navCurrent: string;
  /** 若该阶段输出格式可编辑，传入其 key 以显示「输出格式」入口 */
  promptStage?: PromptStageKey;
  /** 标题右侧额外操作 */
  extra?: ReactNode;
  children: ReactNode;
}

/**
 * 流水线阶段页的统一骨架：渐变序号徽章 + 标题/副标题 + 「输出格式」编辑入口 +
 * 状态感知的流水线轨道 + AI 模式提示。让 8 个车间观感与交互完全一致。
 */
export function StageScaffold({
  badge,
  title,
  subtitle,
  navCurrent,
  promptStage,
  extra,
  children,
}: StageScaffoldProps) {
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <span className="stage-badge">{badge}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            {subtitle}
          </Typography.Paragraph>
        </div>
        <Space wrap>
          {extra}
          {promptStage && (
            <Tooltip title="查看 / 编辑该阶段 AI 的输出格式">
              <Button icon={<SlidersOutlined />} onClick={() => setPromptOpen(true)}>
                输出格式
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      <PipelineNav current={navCurrent} />
      <AiModeBanner />

      {children}

      {promptStage && (
        <PromptEditDrawer stage={promptStage} open={promptOpen} onClose={() => setPromptOpen(false)} />
      )}
    </div>
  );
}
