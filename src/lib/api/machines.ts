import { apiClient } from '@/lib/api/client';
import { mapApiMachineToUi } from '@/lib/mappers/machine.mapper';
import { mapApiAlarmToUi } from '@/lib/mappers/alarm.mapper';
import type { Machine, MachineEvent } from '@/types';
import type {
  DowntimeHistoryPointResponse,
  MachineHistoryQuery,
  PageResponse,
  TelemetryPointResponse,
  TelemetrySeriesResponse,
} from '@/types/api';

const toQueryString = (query: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const raw = search.toString();
  return raw ? `?${raw}` : '';
};

export const machinesApi = {
  async getMachines(): Promise<Machine[]> {
    const data = await apiClient.get<Array<Partial<Machine> & Record<string, unknown>>>('/api/v1/machines');
    return data.map(mapApiMachineToUi);
  },

  async getMachineSnapshots(): Promise<Machine[]> {
    const data = await apiClient.get<Array<Partial<Machine> & Record<string, unknown>>>('/api/v1/machines/realtime-snapshots');
    return data.map(mapApiMachineToUi);
  },

  async getMachineDetail(machineId: string): Promise<Machine> {
    const data = await apiClient.get<Partial<Machine> & Record<string, unknown>>(`/api/v1/machines/${machineId}`);
    return mapApiMachineToUi(data);
  },

  async getMachineLatest(machineId: string): Promise<Machine> {
    const data = await apiClient.get<Partial<Machine> & Record<string, unknown>>(`/api/v1/machines/${machineId}/latest`);
    return mapApiMachineToUi(data);
  },

  async getMachineAlarms(machineId: string, from?: string, to?: string, page = 0, size = 20): Promise<MachineEvent[]> {
    const query = toQueryString({ from, to, page, size });
    const data = await apiClient.get<PageResponse<Partial<MachineEvent> & Record<string, unknown>>>(`/api/v1/machines/${machineId}/alarms/history${query}`);
    return (data.content || []).map(mapApiAlarmToUi);
  },

  async getMachineHistory(machineId: string, query: MachineHistoryQuery): Promise<TelemetryPointResponse[]> {
    const queryString = toQueryString({
      from: query.from,
      to: query.to,
      interval: query.interval,
      aggregation: query.aggregation,
      metrics: query.metrics?.join(','),
      requestedMetrics: query.metrics?.join(','),
    });
    const data = await apiClient.get<TelemetrySeriesResponse>(`/api/v1/machines/${machineId}/telemetry/history${queryString}`);
    return data.points || [];
  },

  async getMachineDowntimeHistory(machineId: string, from?: string, to?: string, page = 0, size = 20): Promise<DowntimeHistoryPointResponse[]> {
    const query = toQueryString({ from, to, page, size });
    const data = await apiClient.get<PageResponse<DowntimeHistoryPointResponse>>(
      `/api/v1/machines/${machineId}/downtime/history${query}`,
    );
    return data.content || [];
  },
};
