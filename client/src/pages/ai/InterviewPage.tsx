import { useState } from 'react';
import { App, Button, Card, Input, List, Space, Typography } from 'antd';
import { SolutionOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/http';
import { StageScaffold } from '../../components/StageScaffold';
import { CopyButton } from '../../components/CopyButton';
import { VersionTimeline } from '../../components/VersionTimeline';
import { useWorkbench } from '../../store/workbenchStore';

/** ② 访谈提纲 —— 需求获取辅助：输入项目领域，AI 生成 ≥8 个用户访谈问题。 */
export function InterviewPage() {
  const { message } = App.useApp();
  const domain = useWorkbench((s) => s.data.interview.domain);
  const questions = useWorkbench((s) => s.data.interview.questions);
  const patch = useWorkbench((s) => s.patch);
  const reset = useWorkbench((s) => s.reset);
  const saveVersion = useWorkbench((s) => s.saveVersion);
  const [loading, setLoading] = useState(false);

  const allText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await aiService.interview(domain.trim());
      patch('interview', { questions: result.questions });
      if (result.questions.length === 0) {
        message.warning('未生成问题，请尝试更具体的项目领域');
      } else {
        saveVersion('interview', '生成', result.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
      }
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StageScaffold
      badge="②"
      title="访谈提纲生成器"
      subtitle="输入项目领域，AI 生成可用于课堂演示的用户访谈提纲（至少 8 个开放式问题），辅助需求获取。"
      navCurrent="interview"
      promptStage="interview"
    >
      <Card size="small" className="surface-card" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={domain}
            onChange={(e) => patch('interview', { domain: e.target.value })}
            placeholder="如 智慧图书馆 / 校园二手书交易平台"
            onPressEnter={handleGenerate}
            allowClear
            size="large"
          />
          <Button
            type="primary"
            size="large"
            icon={<SolutionOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!domain.trim()}
          >
            生成提纲
          </Button>
        </Space.Compact>
      </Card>

      {questions.length > 0 && (
        <Card
          size="small"
          className="surface-card"
          title={`访谈问题（共 ${questions.length} 个）`}
          extra={
            <Space wrap>
              <VersionTimeline stageKey="interview" currentText={allText} />
              <CopyButton text={allText} label="复制全部" />
              <Button size="small" danger onClick={() => reset('interview')}>
                清空
              </Button>
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
    </StageScaffold>
  );
}
