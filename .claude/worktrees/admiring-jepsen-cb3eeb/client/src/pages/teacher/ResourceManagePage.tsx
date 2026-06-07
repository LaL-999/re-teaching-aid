import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Menu,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import { moduleService } from '../../services/moduleService';
import { resourceService } from '../../services/resourceService';
import { getApiErrorMessage } from '../../services/http';
import { saveBlob, formatBytes } from '../../utils/file';
import { ResourcePreviewModal } from '../../components/ResourcePreviewModal';
import { UploadResourceModal } from '../../components/UploadResourceModal';
import type { ModuleDto, ResourceDto } from '../../types';

export function ResourceManagePage() {
  const { message, modal } = App.useApp();
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
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
      setLoadingResources(true);
      try {
        setResources(await resourceService.listByModule(moduleId));
      } catch (err) {
        message.error(getApiErrorMessage(err));
      } finally {
        setLoadingResources(false);
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

  const refresh = (): void => {
    if (activeModuleId !== null) {
      void loadResources(activeModuleId);
    }
    void loadModules();
  };

  const handleDownload = async (resource: ResourceDto): Promise<void> => {
    try {
      const blob = await resourceService.fetchBlob(resource.downloadUrl);
      saveBlob(blob, resource.originalFilename);
    } catch (err) {
      message.error(getApiErrorMessage(err, '下载失败，请稍后重试'));
    }
  };

  const handleDelete = (resource: ResourceDto): void => {
    modal.confirm({
      title: `删除「${resource.name}」？`,
      content: '删除后不可恢复，关联文件也将被移除。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await resourceService.remove(resource.id);
          message.success('已删除');
          refresh();
        } catch (err) {
          message.error(getApiErrorMessage(err));
        }
      },
    });
  };

  const ellipsisStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

  const columns: ColumnsType<ResourceDto> = [
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      // 弹性列；fixed 布局下名称/描述单行省略，避免窄列里把表头挤成竖排
      render: (_value, record) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, ...ellipsisStyle }}>{record.name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#8c8c8c', ...ellipsisStyle }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'ext',
      key: 'ext',
      width: 64,
      render: (ext: string) => <Tag color="blue">{ext.toUpperCase()}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 78,
      render: (size: number) => formatBytes(size),
    },
    { title: '上传者', dataIndex: 'uploaderName', key: 'uploaderName', width: 78 },
    { title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', width: 165 },
    {
      title: '操作',
      key: 'action',
      width: 184,
      render: (_value, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewResource(record)}
          >
            预览
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        资源管理
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        按教学模块上传与管理课件资源，支持 ppt / word / pdf / txt。
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
            extra={
              <Button
                type="primary"
                icon={<UploadOutlined />}
                disabled={!activeModule}
                onClick={() => setUploadOpen(true)}
              >
                上传资源
              </Button>
            }
          >
            <Table<ResourceDto>
              rowKey="id"
              columns={columns}
              dataSource={resources}
              loading={loadingResources}
              pagination={false}
              tableLayout="fixed"
              locale={{ emptyText: <Empty description="该模块暂无资源" /> }}
            />
          </Card>
        </Col>
      </Row>

      <UploadResourceModal
        open={uploadOpen}
        modules={modules}
        defaultModuleId={activeModuleId}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          refresh();
        }}
      />

      <ResourcePreviewModal
        resource={previewResource}
        open={previewResource !== null}
        onClose={() => setPreviewResource(null)}
      />
    </>
  );
}
