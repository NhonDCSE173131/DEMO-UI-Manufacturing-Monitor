import { apiClient } from '@/lib/api/client';
import { AppError } from '@/lib/domain/errors';
import type {
  AnalyticsBreakdownItemResponse,
  AnalyticsSeriesPointResponse,
  EnergyOverviewResponse,
} from '@/types/api';

const toQueryString = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const raw = params.toString();
  return raw ? `?${raw}` : '';
};

const withFallback = async <T>(primary: () => Promise<T>, fallback?: () => Promise<T>) => {
  try {
    return await primary();
  } catch (error) {
    if (fallback && error instanceof AppError && error.status === 404) {
      return fallback();
    }
    throw error;
  }
};

const unwrapSeries = (data: unknown): AnalyticsSeriesPointResponse[] => {
  if (Array.isArray(data)) return data as AnalyticsSeriesPointResponse[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.points)) return record.points as AnalyticsSeriesPointResponse[];
    if (Array.isArray(record.series)) return record.series as AnalyticsSeriesPointResponse[];
    if (Array.isArray(record.items)) return record.items as AnalyticsSeriesPointResponse[];
    if (Array.isArray(record.trend)) return record.trend as AnalyticsSeriesPointResponse[];
  }
  return [];
};

const unwrapBreakdown = (data: unknown): AnalyticsBreakdownItemResponse[] => {
  if (Array.isArray(data)) return data as AnalyticsBreakdownItemResponse[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as AnalyticsBreakdownItemResponse[];
    if (Array.isArray(record.content)) return record.content as AnalyticsBreakdownItemResponse[];
    if (Array.isArray(record.data)) return record.data as AnalyticsBreakdownItemResponse[];
    if (Array.isArray(record.byArea)) return record.byArea as AnalyticsBreakdownItemResponse[];
    if (Array.isArray(record.byMachine)) return record.byMachine as AnalyticsBreakdownItemResponse[];
  }
  return [];
};

export interface EnergyAnalyticsQuery extends Record<string, string | number | undefined> {
  from?: string;
  to?: string;
  range?: string;
  interval?: string;
  aggregation?: string;
}

export const energyApi = {
  async getOverview(): Promise<EnergyOverviewResponse> {
    return withFallback(
      () => apiClient.get<EnergyOverviewResponse>('/api/v1/analytics/energy/overview'),
      () => apiClient.get<EnergyOverviewResponse>('/api/v1/energy/overview'),
    );
  },

  async getTrend(query: EnergyAnalyticsQuery = {}): Promise<AnalyticsSeriesPointResponse[]> {
    const queryString = toQueryString(query);
    const response = await apiClient.get<unknown>(`/api/v1/analytics/energy/trend${queryString}`);
    return unwrapSeries(response);
  },

  async getByArea(query: EnergyAnalyticsQuery = {}): Promise<AnalyticsBreakdownItemResponse[]> {
    const queryString = toQueryString(query);
    const response = await apiClient.get<unknown>(`/api/v1/analytics/energy/by-area${queryString}`);
    return unwrapBreakdown(response);
  },

  async getByMachine(query: EnergyAnalyticsQuery = {}): Promise<AnalyticsBreakdownItemResponse[]> {
    const queryString = toQueryString(query);
    const response = await apiClient.get<unknown>(`/api/v1/analytics/energy/by-machine${queryString}`);
    return unwrapBreakdown(response);
  },

  async getCost(query: EnergyAnalyticsQuery = {}): Promise<EnergyOverviewResponse> {
    const queryString = toQueryString(query);
    const response = await apiClient.get<unknown>(`/api/v1/analytics/energy/cost${queryString}`);
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      return response as EnergyOverviewResponse;
    }
    return { costTrend: unwrapSeries(response) };
  },
};

