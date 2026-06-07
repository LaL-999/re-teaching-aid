import { Fragment } from 'react';
import { Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PIPELINE_STAGES } from '../pipeline';

interface PipelineNavProps {
  current: string;
}

/** 顶部流水线导航：展示 7 个车间的顺序与当前所处位置，可点击跳转，体现闭环串联。 */
export function PipelineNav({ current }: PipelineNavProps) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        padding: '8px 12px',
        background: '#f7f9fc',
        border: '1px solid #eef1f6',
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      {PIPELINE_STAGES.map((stage, index) => {
        const active = stage.key === current;
        return (
          <Fragment key={stage.key}>
            {index > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ›
              </Typography.Text>
            )}
            <Tag
              color={active ? 'blue' : 'default'}
              style={{ cursor: 'pointer', margin: 0, userSelect: 'none' }}
              onClick={() => navigate(stage.to)}
            >
              {stage.num} {stage.label}
            </Tag>
          </Fragment>
        );
      })}
    </div>
  );
}
