import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleFilled } from '@ant-design/icons';
import { PIPELINE_STAGES } from '../pipeline';
import { stageHasOutput, useWorkbench, type StageKey } from '../store/workbenchStore';

interface PipelineNavProps {
  current: string;
}

/**
 * 顶部流水线轨道：展示 8 个车间的顺序、当前位置与「是否已产出」状态，可点击跳转，
 * 用 ✓ 与箭头把闭环串联可视化，体现数据自上游流向下游。
 */
export function PipelineNav({ current }: PipelineNavProps) {
  const navigate = useNavigate();
  const data = useWorkbench((s) => s.data);

  return (
    <div className="pipeline-rail" role="navigation" aria-label="需求工程流水线" style={{ marginBottom: 16 }}>
      {PIPELINE_STAGES.map((stage, index) => {
        const active = stage.key === current;
        const done = stageHasOutput(data, stage.key as StageKey);
        return (
          <Fragment key={stage.key}>
            {index > 0 && (
              <span className="rail-arrow" aria-hidden="true">
                →
              </span>
            )}
            <button
              type="button"
              className={`rail-stop${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
              onClick={() => navigate(stage.to)}
              aria-current={active ? 'step' : undefined}
              title={`${stage.num} ${stage.label}${done ? '（已产出）' : ''}`}
            >
              {done ? (
                <CheckCircleFilled style={{ color: '#16a34a', fontSize: 13 }} />
              ) : (
                <span className="rail-dot" />
              )}
              <span>
                {stage.num} {stage.label}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
