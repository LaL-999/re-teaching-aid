import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config';
import { AppError } from '../../middleware/error';
import { moduleRepository } from '../catalog/module.repository';
import { decodeOriginalName, extOf } from './upload';
import {
  resourceRepository,
  type ResourceJoinedRow,
} from './resource.repository';

const PREVIEWABLE_EXT = new Set(['pdf', 'txt']);

export interface ResourceDto {
  id: number;
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  name: string;
  description: string;
  originalFilename: string;
  ext: string;
  mimeType: string;
  size: number;
  uploaderName: string;
  createdAt: string;
  previewable: boolean;
  previewUrl: string;
  downloadUrl: string;
}

export interface UploadedFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface CreateResourceInput {
  moduleId: number;
  name: string;
  description: string;
  file: UploadedFile;
  uploadedBy: number;
}

function safeUnlink(absolutePath: string): void {
  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch {
    /* 清理失败不影响主流程 */
  }
}

function toDto(row: ResourceJoinedRow): ResourceDto {
  return {
    id: row.id,
    moduleId: row.module_id,
    moduleCode: row.module_code,
    moduleName: row.module_name,
    name: row.name,
    description: row.description,
    originalFilename: row.original_filename,
    ext: row.ext,
    mimeType: row.mime_type,
    size: row.size,
    uploaderName: row.uploader_name,
    createdAt: row.created_at,
    previewable: PREVIEWABLE_EXT.has(row.ext),
    previewUrl: `/api/resources/${row.id}/preview`,
    downloadUrl: `/api/resources/${row.id}/download`,
  };
}

export const resourceService = {
  create(input: CreateResourceInput): ResourceDto {
    const module = moduleRepository.findById(input.moduleId);
    if (!module) {
      safeUnlink(input.file.path);
      throw new AppError(400, '所选模块不存在');
    }

    const originalFilename = decodeOriginalName(input.file.originalname);
    const id = resourceRepository.insert({
      moduleId: input.moduleId,
      name: input.name.trim() || originalFilename,
      description: input.description.trim(),
      originalFilename,
      storedFilename: input.file.filename,
      mimeType: input.file.mimetype,
      ext: extOf(originalFilename),
      size: input.file.size,
      uploadedBy: input.uploadedBy,
    });

    const row = resourceRepository.findById(id);
    if (!row) {
      throw new AppError(500, '资源保存失败');
    }
    return toDto(row);
  },

  listByModule(moduleId: number): ResourceDto[] {
    return resourceRepository.listByModule(moduleId).map(toDto);
  },

  /** 取可服务文件；文件缺失/损坏 → 「文件无法预览，请下载后打开」。 */
  getServableFile(id: number): { row: ResourceJoinedRow; absolutePath: string } {
    const row = resourceRepository.findById(id);
    if (!row) {
      throw new AppError(404, '资源不存在');
    }
    const absolutePath = path.join(config.paths.uploadsDir, row.stored_filename);
    if (!fs.existsSync(absolutePath)) {
      throw new AppError(422, '文件无法预览，请下载后打开');
    }
    return { row, absolutePath };
  },

  remove(id: number): void {
    const row = resourceRepository.findById(id);
    if (!row) {
      throw new AppError(404, '资源不存在');
    }
    safeUnlink(path.join(config.paths.uploadsDir, row.stored_filename));
    resourceRepository.deleteById(id);
  },
};
