import { apiClient } from '@/lib/api/client';
import { mapApiAlarmToUi } from '@/lib/mappers/alarm.mapper';
import type { MachineEvent } from '@/types';
import type { AcknowledgeAlarmRequest, PageResponse } from '@/types/api';

export const alarmsApi = {
  async getActiveAlarms(): Promise<MachineEvent[]> {
    const data = await apiClient.get<Array<Partial<MachineEvent> & Record<string, unknown>>>('/api/v1/alarms/active');
    return data.map(mapApiAlarmToUi);
  },

  async getAlarmHistory(page = 0, size = 50): Promise<MachineEvent[]> {
    const data = await apiClient.get<PageResponse<Partial<MachineEvent> & Record<string, unknown>>>(`/api/v1/alarms/history?page=${page}&size=${size}`);
    return (data.content || []).map(mapApiAlarmToUi);
  },

  async acknowledgeAlarm(alarmId: string, body: AcknowledgeAlarmRequest): Promise<void> {
    await apiClient.post(`/api/v1/alarms/${alarmId}/acknowledge`, body);
  },
};

