import { useState } from 'react';
import { Button, App } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';

interface CopyButtonProps {
  text: string;
  label?: string;
  block?: boolean;
}

/** 一键复制文本到剪贴板，带成功反馈。 */
export function CopyButton({ text, label = '复制', block = false }: CopyButtonProps) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success('已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      message.error('复制失败，请手动选择文本复制');
    }
  };

  return (
    <Button
      icon={copied ? <CheckOutlined /> : <CopyOutlined />}
      onClick={handleCopy}
      disabled={!text}
      block={block}
    >
      {copied ? '已复制' : label}
    </Button>
  );
}
