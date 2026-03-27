import { apiClient } from '@/lib/api/client';
import type { ToolsOverviewResponse } from '@/types/api';

export const toolsApi = {
  async getOverview(): Promise<ToolsOverviewResponse> {
    return apiClient.get<ToolsOverviewResponse>('/api/v1/tools/overview');
  },

  async getMachineOverview(machineId: string): Promise<ToolsOverviewResponse> {
    return apiClient.get<ToolsOverviewResponse>(`/api/v1/tools/machines/${machineId}`);
  },
};

