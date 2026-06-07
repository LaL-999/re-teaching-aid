import { useState } from 'react';
import { App, Button, Card, Input, List, Popconfirm, Space, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { AiModeBanner } from '../../components/AiModeBanner';
import { CopyButton } from '../../components/CopyButton';
import { PipelineNav } from '../../components/PipelineNav';
import { useWorkbench } from '../../store/workbenchStore';

export function InterviewPage() {
  const { message } = App.useApp();
  const domain = useWorkbench((s) => s.data.interview.domain);
  const questions = useWorkbench((s) => s.data.interview.questions);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await aiService.interview(domain.trim());
      patch('interview', { questions: result.questions });
      if (result.questions.length === 0) {
        message.warning('未生成问题，请尝试更具体的项目领域');
      }
    } catch (err) {
      // 空输入 → 「请输入项目领域」；超时 → 「AI服务暂时不可用，请稍后重试」
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const allText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        ② 访谈提纲生成器
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        输入项目领域，AI 生成可用于课堂演示的用户访谈提纲（至少 8 个问题），辅助需求获取。
      </Typography.Paragraph>

      <PipelineNav current="interview" />
      <AiModeBanner />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={domain}
            onChange={(e) => patch('interview', { domain: e.target.value })}
            placeholder="如 智慧图书馆 / 校园二手书交易平台"
            onPressEnter={handleGenerate}
            allowClear
            size="large"
          />
          <Button type="primary" size="large" loading={loading} onClick={handleGenerate}>
            生成提纲
          </Button>
        </Space.Compact>
      </Card>

      {questions.length > 0 && (
        <Card
          size="small"
          title={`访谈问题（共 ${questions.length} 个）`}
          extra={
            <Space>
              <CopyButton text={allText} label="复制全部" />
              <Popconfirm
                title="清空本车间？"
                okText="清空"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => reset('interview')}
              >
                <Button danger size="small" icon={<ClearOutlined />}>
                  清空
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <List
            dataSource={questions}
            renderItem={(question, index) => (
              <List.Item>
                <Typography.Text>
                  <Typography.Text strong>{index + 1}.</Typography.Text> {question}
                </Typography.Text>
              </List.Item>
            )}
          />
        </Card>
      )}
    </>
  );
}
