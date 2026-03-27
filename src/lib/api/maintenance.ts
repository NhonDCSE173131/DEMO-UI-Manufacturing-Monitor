import { apiClient } from '@/lib/api/client';
import type { MaintenanceOverviewResponse } from '@/types/api';

export const maintenanceApi = {
  async getOverview(): Promise<MaintenanceOverviewResponse> {
    return apiClient.get<MaintenanceOverviewResponse>('/api/v1/maintenance/overview');
  },
};

