import { apiClient } from '@/lib/api/client';

export interface SettingsThresholds {
  samplingSeconds: number;
  alarmEscalationMinutes: number;
  maintenanceLeadDays: number[];
  retentionDays: number;
  temperatureHighC: number;
  vibrationHighPct: number;
}

export const defaultSettingsThresholds: SettingsThresholds = {
  samplingSeconds: 2,
  alarmEscalationMinutes: 5,
  maintenanceLeadDays: [14, 7, 1],
  retentionDays: 30,
  temperatureHighC: 75,
  vibrationHighPct: 60,
};

export const settingsApi = {
  async getThresholds(): Promise<Partial<SettingsThresholds>> {
    return apiClient.get<Partial<SettingsThresholds>>('/api/v1/settings/thresholds');
  },
};

