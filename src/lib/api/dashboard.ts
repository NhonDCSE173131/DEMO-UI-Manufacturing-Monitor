import { apiClient } from '@/lib/api/client';

export interface DashboardOverviewResponse {
  totalMachines?: number;
  onlineMachines?: number;
  runningMachines?: number;
  criticalAlarms?: number;
  plantPowerKw?: number;
  todayEnergyKwh?: number;
  todayOee?: number;
  abnormalStops?: number;
  topRiskMachines?: Array<Record<string, unknown>>;
}

export const dashboardApi = {
  async getOverview(): Promise<DashboardOverviewResponse> {
    return apiClient.get<DashboardOverviewResponse>('/api/v1/dashboard/overview');
  },
};

