import { useEffect, useState } from 'react';
import { Alert } from 'antd';
import { aiService } from '../services/aiService';
import type { AiStatus } from '../types';

/** 当后端处于离线 Mock 模式时，提示用户 AI 结果为内置确定性数据。 */
export function AiModeBanner() {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let active = true;
    aiService
      .status()
      .then((value) => {
        if (active) {
          setStatus(value);
        }
      })
      .catch(() => {
        /* 状态获取失败不影响功能，静默 */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!status || status.mode !== 'mock') {
    return null;
  }

  return (
    <Alert
      type="info"
      showIcon
      banner
      style={{ marginBottom: 16 }}
      message="当前为离线 Mock 模式"
      description="后端未配置真实大模型（LLM_API_KEY 为空），以下 AI 结果由内置确定性数据生成，可用于演示全部功能。配置 server/.env 后即切换为真实模型。"
    />
  );
}
