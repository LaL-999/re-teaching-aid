import { moduleRepository } from './module.repository';

export interface ModuleDto {
  id: number;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  resourceCount: number;
}

export const moduleService = {
  list(): ModuleDto[] {
    return moduleRepository.listAllWithCount().map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      resourceCount: row.resource_count,
    }));
  },
};
