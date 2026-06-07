import { http } from './http';
import type { ModuleDto } from '../types';

export const moduleService = {
  async list(): Promise<ModuleDto[]> {
    const { data } = await http.get<{ modules: ModuleDto[] }>('/api/modules');
    return data.modules;
  },
};
