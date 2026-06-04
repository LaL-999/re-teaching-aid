import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Badge, Card, Col, Empty, List, Menu, Row, Space, Tag, Typography } from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { moduleService } from '../../services/moduleService';
import { resourceService } from '../../services/resourceService';
import { getApiErrorMessage } from '../../services/http';
import { saveBlob, formatBytes } from '../../utils/file';
import { ResourcePreviewModal } from '../../components/ResourcePreviewModal';
import type { ModuleDto, ResourceDto } from '../../types';

export function ResourceBrowsePage() {
  const { message } = App.useApp();
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewResource, setPreviewResource] = useState<ResourceDto | null>(null);

  const loadModules = useCallback(async (): Promise<void> => {
    try {
      const list = await moduleService.list();
      setModules(list);
      setActiveModuleId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    }
  }, [message]);

  const loadResources = useCallback(
    async (moduleId: number): Promise<void> => {
      setLoading(true);
      try {
        setResources(await resourceService.listByModule(moduleId));
      } catch (err) {
        message.error(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  useEffect(() => {
    if (activeModuleId !== null) {
      void loadResources(activeModuleId);
    }
  }, [activeModuleId, loadResources]);

  const activeModule = useMemo(
    () => modules.find((m) => m.id === activeModuleId) ?? null,
    [modules, activeModuleId],
  );

  const handleDownload = async (resource: ResourceDto): Promise<void> => {
    try {
      const blob = await resourceService.fetchBlob(resource.downloadUrl);
      saveBlob(blob, resource.originalFilename);
    } catch (err) {
      message.error(getApiErrorMessage(err, '下载失败，请稍后重试'));
    }
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        课件浏览
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        按教学模块浏览教师上传的课件与资源，可在线预览或下载。
      </Typography.Paragraph>

      <Row gutter={16}>
        <Col xs={24} md={7} lg={6}>
          <Card title="教学模块" size="small" styles={{ body: { padding: 0 } }}>
            <Menu
              mode="inline"
              selectedKeys={activeModuleId !== null ? [String(activeModuleId)] : []}
              onClick={({ key }) => setActiveModuleId(Number(key))}
              items={modules.map((m) => ({
                key: String(m.id),
                label: (
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span>
                      {m.code} {m.name}
                    </span>
                    <Badge count={m.resourceCount} showZero color="#1677ff" />
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} md={17} lg={18}>
          <Card
            size="small"
            title={activeModule ? `${activeModule.code} ${activeModule.name}` : '资源列表'}
            loading={loading}
          >
            {resources.length === 0 && !loading ? (
              <Empty description="暂无资源" />
            ) : (
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
                dataSource={resources}
                renderItem={(resource) => (
                  <List.Item>
                    <Card
                      size="small"
                      hoverable
                      title={
                        <Space>
                          <Tag color="blue">{resource.ext.toUpperCase()}</Tag>
                          <span>{resource.name}</span>
                        </Space>
                      }
                      actions={[
                        <a key="preview" onClick={() => setPreviewResource(resource)}>
                          <EyeOutlined /> 预览
                        </a>,
                        <a key="download" onClick={() => handleDownload(resource)}>
                          <DownloadOutlined /> 下载
                        </a>,
                      ]}
                    >
                      <Typography.Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ minHeight: 44, marginBottom: 8 }}
                      >
                        {resource.description || '（无描述）'}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatBytes(resource.size)} · {resource.uploaderName} · {resource.createdAt}
                      </Typography.Text>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <ResourcePreviewModal
        resource={previewResource}
        open={previewResource !== null}
        onClose={() => setPreviewResource(null)}
      />
    </>
  );
}
