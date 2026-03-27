/**
 * useRealtimeStream - Thin selector hook
 * Đọc trạng thái từ global RealtimeStore thay vì tự mở EventSource.
 * EventSource thực sự được quản lý bởi RealtimeProvider (cấp app).
 */
import { useRealtimeStore, type ConnectionStatus } from '@/lib/realtime-store';

export type StreamStatus = ConnectionStatus;

export const useRealtimeStream = (_options?: {
  enabled?: boolean;
  machineId?: string;
  topics?: string[];
  onEvent?: (event: unknown) => void;
}) => {
  const { connectionStatus, lastEventId, lastMessageAt, connectionError } = useRealtimeStore();

  return {
    status: connectionStatus,
    lastEventId,
    lastMessageAt,
    error: connectionError,
    isLive: connectionStatus === 'live',
    isEnabled: true,
  };
};
