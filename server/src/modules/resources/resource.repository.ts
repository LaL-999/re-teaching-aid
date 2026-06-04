import { getDb } from '../../db';

export interface ResourceRow {
  id: number;
  module_id: number;
  name: string;
  description: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  ext: string;
  size: number;
  uploaded_by: number;
  created_at: string;
}

export interface ResourceJoinedRow extends ResourceRow {
  module_code: string;
  module_name: string;
  uploader_name: string;
}

export interface NewResource {
  moduleId: number;
  name: string;
  description: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  ext: string;
  size: number;
  uploadedBy: number;
}

const JOIN_SELECT = `
  SELECT r.*, m.code AS module_code, m.name AS module_name, u.name AS uploader_name
  FROM resources r
  JOIN modules m ON m.id = r.module_id
  JOIN users u ON u.id = r.uploaded_by
`;

export const resourceRepository = {
  insert(input: NewResource): number {
    const info = getDb()
      .prepare(
        `INSERT INTO resources
           (module_id, name, description, original_filename, stored_filename, mime_type, ext, size, uploaded_by)
         VALUES
           (@moduleId, @name, @description, @originalFilename, @storedFilename, @mimeType, @ext, @size, @uploadedBy)`,
      )
      .run(input);
    return Number(info.lastInsertRowid);
  },

  findById(id: number): ResourceJoinedRow | undefined {
    return getDb().prepare(`${JOIN_SELECT} WHERE r.id = ?`).get(id) as ResourceJoinedRow | undefined;
  },

  listByModule(moduleId: number): ResourceJoinedRow[] {
    return getDb()
      .prepare(`${JOIN_SELECT} WHERE r.module_id = ? ORDER BY r.created_at DESC, r.id DESC`)
      .all(moduleId) as ResourceJoinedRow[];
  },

  deleteById(id: number): void {
    getDb().prepare('DELETE FROM resources WHERE id = ?').run(id);
  },
};
