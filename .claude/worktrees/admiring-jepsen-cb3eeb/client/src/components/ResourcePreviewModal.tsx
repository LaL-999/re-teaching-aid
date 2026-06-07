import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Space, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { resourceService } from '../services/resourceService';
import { getApiErrorMessage } from '../services/http';
import { saveBlob } from '../utils/file';
import type { ResourceDto } from '../types';

interface ResourcePreviewModalProps {
  resource: ResourceDto | null;
  open: boolean;
  onClose: () => void;
}

export function ResourcePreviewModal({ resource, open, onClose }: ResourcePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !resource || !resource.previewable) {
      return undefined;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);
    setObjectUrl(null);

    resourceService
      .fetchBlob(resource.previewUrl)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          // 文件损坏 / 丢失时后端返回「文件无法预览，请下载后打开」
          setError(getApiErrorMessage(err, '文件无法预览，请下载后打开'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [open, resource]);

  const handleDownload = async (): Promise<void> => {
    if (!resource) {
      return;
    }
    setDownloading(true);
    try {
      const blob = await resourceService.fetchBlob(resource.downloadUrl);
      saveBlob(blob, resource.originalFilename);
    } catch (err) {
      setError(getApiErrorMessage(err, '下载失败，请稍后重试'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={resource?.name}
      width={920}
      destroyOnHidden
      footer={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownload} loading={downloading}>
            下载
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      {!resource ? null : !resource.previewable ? (
        <Alert
          type="info"
          showIcon
          message="该格式暂不支持在线预览"
          description={`「${resource.ext.toUpperCase()}」文件请点击下载后，用本地软件打开。`}
        />
      ) : error ? (
        <Alert type="warning" showIcon message={error} />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#888' }}>加载中…</div>
        </div>
      ) : objectUrl ? (
        <iframe
          title={resource.name}
          src={objectUrl}
          style={{ width: '100%', height: '70vh', border: '1px solid #f0f0f0', borderRadius: 6 }}
        />
      ) : null}
    </Modal>
  );
}
