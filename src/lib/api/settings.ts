import { apiClient } from '@/lib/api/client';
import { AppError } from '@/lib/domain/errors';

export interface SettingsThresholds {
  samplingSeconds: number;
  alarmEscalationMinutes: number;
  maintenanceLeadDays: number[];
  retentionDays: number;
  temperatureHighC: number;
  vibrationHighPct: number;
}

interface ThresholdResponseItem {
  key?: string;
  code?: string;
  name?: string;
  value?: unknown;
}

export const defaultSettingsThresholds: SettingsThresholds = {
  samplingSeconds: 2,
  alarmEscalationMinutes: 5,
  maintenanceLeadDays: [14, 7, 1],
  retentionDays: 30,
  temperatureHighC: 75,
  vibrationHighPct: 60,
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const toNumberArray = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .map((item) => toNumber(item))
    .filter((item): item is number => item !== undefined);
  return parsed.length > 0 ? parsed : undefined;
};

const normalizeKey = (raw: string): string => raw.toLowerCase().replace(/[\s._-]/g, '');

const mapThresholdListToSettings = (items: ThresholdResponseItem[]): Partial<SettingsThresholds> => {
  const out: Partial<SettingsThresholds> = {};

  items.forEach((item) => {
    const rawKey = String(item.key || item.code || item.name || '');
    const key = normalizeKey(rawKey);
    if (!key) return;

    if (key.includes('sampling') || key.includes('polling') || key.includes('intervalsecond')) {
      const n = toNumber(item.value);
      if (n !== undefined) out.samplingSeconds = n;
      return;
    }
    if (key.includes('alarmescalation') || key.includes('escalationminute')) {
      const n = toNumber(item.value);
      if (n !== undefined) out.alarmEscalationMinutes = n;
      return;
    }
    if (key.includes('maintenancelead') || key.includes('reminderdays')) {
      const arr = toNumberArray(item.value);
      if (arr) out.maintenanceLeadDays = arr;
      return;
    }
    if (key.includes('retention')) {
      const n = toNumber(item.value);
      if (n !== undefined) out.retentionDays = n;
      return;
    }
    if (key.includes('temperature') && key.includes('high')) {
      const n = toNumber(item.value);
      if (n !== undefined) out.temperatureHighC = n;
      return;
    }
    if (key.includes('vibration') && key.includes('high')) {
      const n = toNumber(item.value);
      if (n !== undefined) out.vibrationHighPct = n;
    }
  });

  return out;
};

const normalizeThresholdsResponse = (raw: unknown): Partial<SettingsThresholds> => {
  if (Array.isArray(raw)) {
    return mapThresholdListToSettings(raw as ThresholdResponseItem[]);
  }
  if (raw && typeof raw === 'object') {
    return raw as Partial<SettingsThresholds>;
  }
  return {};
};

export const settingsApi = {
  async getThresholds(): Promise<Partial<SettingsThresholds>> {
    try {
      const data = await apiClient.get<unknown>('/api/v1/settings/thresholds');
      return normalizeThresholdsResponse(data);
    } catch (error) {
      // Backward compatibility for older BE builds
      if (error instanceof AppError && error.status === 404) {
        const legacy = await apiClient.get<unknown>('/api/v1/settings/ui-thresholds');
        return normalizeThresholdsResponse(legacy);
      }
      throw error;
    }
  },
};
