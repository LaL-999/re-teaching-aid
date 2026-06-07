import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../../config';
import { AppError } from '../../middleware/error';

/** 允许上传的文件扩展名白名单（对应需求：ppt/word/pdf/txt）。 */
export const ALLOWED_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'pdf', 'txt'] as const;

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

/**
 * multer/busboy 默认以 latin1 解码 multipart 文件名，中文会乱码。
 * 此处重新按 utf-8 解释，恢复原始中文名。
 */
export function decodeOriginalName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf-8');
}

export function extOf(filename: string): string {
  return path.extname(filename).slice(1).toLowerCase();
}

function isAllowedExt(ext: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(config.paths.uploadsDir, { recursive: true });
    cb(null, config.paths.uploadsDir);
  },
  filename(_req, file, cb) {
    const ext = extOf(decodeOriginalName(file.originalname));
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, ext ? `${unique}.${ext}` : unique);
  },
});

/** 单文件上传中间件，字段名 file。类型不在白名单 → 「不支持该文件类型」。 */
export const uploadSingle = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    const ext = extOf(decodeOriginalName(file.originalname));
    if (!isAllowedExt(ext)) {
      cb(new AppError(400, '不支持该文件类型'));
      return;
    }
    cb(null, true);
  },
}).single('file');
