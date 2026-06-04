import { useState } from 'react';
import { App, Form, Input, Modal, Select, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { resourceService } from '../services/resourceService';
import { getApiErrorMessage } from '../services/http';
import type { ModuleDto } from '../types';

const ALLOWED_EXT = ['ppt', 'pptx', 'doc', 'docx', 'pdf', 'txt'];

interface UploadResourceModalProps {
  open: boolean;
  modules: ModuleDto[];
  defaultModuleId: number | null;
  onClose: () => void;
  onUploaded: () => void;
}

interface FormValues {
  moduleId: number;
  name: string;
  description?: string;
}

function extOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function UploadResourceModal({
  open,
  modules,
  defaultModuleId,
  onClose,
  onUploaded,
}: UploadResourceModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleBeforeUpload = (candidate: File): typeof Upload.LIST_IGNORE | false => {
    if (!ALLOWED_EXT.includes(extOf(candidate.name))) {
      message.error('不支持该文件类型');
      return Upload.LIST_IGNORE;
    }
    setFile(candidate);
    if (!form.getFieldValue('name')) {
      form.setFieldValue('name', candidate.name);
    }
    return false; // 阻止自动上传，改为提交时手动上传
  };

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    if (!file) {
      message.error('请上传文件');
      return;
    }
    setSubmitting(true);
    try {
      await resourceService.upload({
        moduleId: values.moduleId,
        name: values.name,
        description: values.description ?? '',
        file,
      });
      message.success('上传成功');
      form.resetFields();
      setFile(null);
      onUploaded();
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    form.resetFields();
    setFile(null);
    onClose();
  };

  const fileList: UploadFile[] = file ? [{ uid: '1', name: file.name, status: 'done' }] : [];

  return (
    <Modal
      open={open}
      title="上传课件 / 资源"
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="上传"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ moduleId: defaultModuleId ?? undefined }}
      >
        <Form.Item
          name="moduleId"
          label="所属模块"
          rules={[{ required: true, message: '请选择所属模块' }]}
        >
          <Select
            placeholder="请选择所属模块"
            options={modules.map((m) => ({ value: m.id, label: `${m.code} ${m.name}` }))}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="资源名称"
          rules={[{ required: true, message: '请输入资源名称' }]}
        >
          <Input placeholder="如 第1章 概述.pptx" />
        </Form.Item>

        <Form.Item name="description" label="描述（可选）">
          <Input.TextArea rows={2} placeholder="简要说明该资源用途" />
        </Form.Item>

        <Form.Item label="文件" required>
          <Upload.Dragger
            beforeUpload={handleBeforeUpload}
            maxCount={1}
            accept=".ppt,.pptx,.doc,.docx,.pdf,.txt"
            onRemove={() => setFile(null)}
            fileList={fileList}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">支持 ppt / pptx / doc / docx / pdf / txt</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
