import { getDb } from '../../db';

export interface ModuleRow {
  id: number;
  code: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface ModuleWithCountRow extends ModuleRow {
  resource_count: number;
}

export const moduleRepository = {
  listAllWithCount(): ModuleWithCountRow[] {
    return getDb()
      .prepare(
        `SELECT m.id, m.code, m.name, m.description, m.sort_order,
                COUNT(r.id) AS resource_count
         FROM modules m
         LEFT JOIN resources r ON r.module_id = m.id
         GROUP BY m.id
         ORDER BY m.sort_order, m.id`,
      )
      .all() as ModuleWithCountRow[];
  },

  findById(id: number): ModuleRow | undefined {
    return getDb().prepare('SELECT * FROM modules WHERE id = ?').get(id) as ModuleRow | undefined;
  },
};
