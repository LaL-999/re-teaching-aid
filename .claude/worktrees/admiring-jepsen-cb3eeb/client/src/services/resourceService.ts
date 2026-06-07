import { http } from './http';
import type { ResourceDto } from '../types';

export interface UploadResourceInput {
  moduleId: number;
  name: string;
  description: string;
  file: File;
}

export const resourceService = {
  async listByModule(moduleId: number): Promise<ResourceDto[]> {
    const { data } = await http.get<{ resources: ResourceDto[] }>(
      `/api/resources/module/${moduleId}`,
    );
    return data.resources;
  },

  async upload(input: UploadResourceInput): Promise<ResourceDto> {
    const form = new FormData();
    form.append('moduleId', String(input.moduleId));
    form.append('name', input.name);
    form.append('description', input.description);
    form.append('file', input.file);
    // 不手动设置 Content-Type，交由浏览器附带 multipart 边界
    const { data } = await http.post<{ resource: ResourceDto }>('/api/resources', form);
    return data.resource;
  },

  /** 以 blob 拉取预览/下载文件（带鉴权头，避免 token 暴露在 URL）。 */
  async fetchBlob(url: string): Promise<Blob> {
    const { data } = await http.get(url, { responseType: 'blob' });
    return data as Blob;
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/api/resources/${id}`);
  },
};
