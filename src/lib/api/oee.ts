import { apiClient } from '@/lib/api/client';
import { AppError } from '@/lib/domain/errors';
import type {
  AnalyticsBreakdownItemResponse,
  AnalyticsSeriesPointResponse,
  OeeOverviewResponse,
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
	if (Array.isArray(record.losses)) return record.losses as AnalyticsBreakdownItemResponse[];
	if (Array.isArray(record.byMachine)) return record.byMachine as AnalyticsBreakdownItemResponse[];
  }
  return [];
};

export interface OeeAnalyticsQuery extends Record<string, string | number | undefined> {
  from?: string;
  to?: string;
  range?: string;
  interval?: string;
  aggregation?: string;
}

export const oeeApi = {
  async getOverview(): Promise<OeeOverviewResponse> {
	return withFallback(
	  () => apiClient.get<OeeOverviewResponse>('/api/v1/analytics/oee/overview'),
	  () => apiClient.get<OeeOverviewResponse>('/api/v1/oee/overview'),
	);
  },

  async getTrend(query: OeeAnalyticsQuery = {}): Promise<AnalyticsSeriesPointResponse[]> {
	const queryString = toQueryString(query);
	const response = await apiClient.get<unknown>(`/api/v1/analytics/oee/trend${queryString}`);
	return unwrapSeries(response);
  },

  async getByMachine(query: OeeAnalyticsQuery = {}): Promise<AnalyticsBreakdownItemResponse[]> {
	const queryString = toQueryString(query);
	const response = await apiClient.get<unknown>(`/api/v1/analytics/oee/by-machine${queryString}`);
	return unwrapBreakdown(response);
  },

  async getLosses(query: OeeAnalyticsQuery = {}): Promise<AnalyticsBreakdownItemResponse[]> {
	const queryString = toQueryString(query);
	const response = await apiClient.get<unknown>(`/api/v1/analytics/oee/losses${queryString}`);
	return unwrapBreakdown(response);
  },
};

