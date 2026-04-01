import { appEnv } from '@/lib/config/env';
import type { SseEventEnvelope } from '@/types/api';

export type RealtimeTopic = 'snapshot' | 'telemetry' | 'alarm' | 'downtime' | 'connection' | 'machine.connection' | 'heartbeat' | 'all';

/**
 * Danh sách event types theo BE-API-DOCUMENTATION:
 * - snapshot.updated: Snapshot realtime mỗi 1 giây (EVENT CHÍNH CHO UI)
 * - telemetry.updated: Dữ liệu telemetry raw từ PLC
 * - alarm.triggered / alarm.cleared: Alarm events
 * - machine.connection.*: Connection state changes
 * - heartbeat: Keep-alive signal
 */
export const namedRealtimeEvents = [
  // Core events from BE (theo doc)
  'snapshot.updated',       // ⭐ EVENT CHÍNH - mỗi 1 giây
  'telemetry.updated',
  'alarm.triggered',
  'alarm.cleared',
  'downtime.started',
  'downtime.ended',
  'machine.connection.changed',
  'machine.connection.online',
  'machine.connection.stale',
  'machine.connection.offline',
  'machine.connection.unstable',
  'heartbeat',
] as const;

export type NamedRealtimeEvent = (typeof namedRealtimeEvents)[number];

export interface RealtimeEnvelope<T = unknown> {
  eventId?: string;
  topic?: RealtimeTopic | string;
  eventName?: NamedRealtimeEvent | string;
  eventType?: string;
  timestamp?: string;
  data?: T;
  machineId?: string;
  machineCode?: string;
  sequence?: number;
  quality?: number | null;
}

const mapEventTypeToTopic = (eventType?: string, fallbackTopic?: string): string | undefined => {
  if (!eventType) return fallbackTopic;
  // snapshot.updated → snapshot
  if (eventType.startsWith('snapshot')) return 'snapshot';
  // telemetry.updated → telemetry
  if (eventType.startsWith('telemetry')) return 'telemetry';
  // alarm.triggered, alarm.cleared → alarm
  if (eventType.startsWith('alarm')) return 'alarm';
  // downtime.started, downtime.ended → downtime
  if (eventType.startsWith('downtime')) return 'downtime';
  // machine.connection.* → connection
  if (eventType.startsWith('machine.connection')) return 'connection';
  // heartbeat
  if (eventType === 'heartbeat') return 'heartbeat';
  return fallbackTopic || eventType;
};

export const buildRealtimeStreamUrl = (params?: {
  machineId?: string;
  topics?: RealtimeTopic[];
  sinceEventId?: string;
}) => {
  // Theo BE doc: /api/v1/realtime/stream
  const url = new URL('/api/v1/realtime/stream', appEnv.apiBaseUrl);
  if (params?.machineId) {
    url.searchParams.set('machineId', params.machineId);
  }
  if (params?.topics && params.topics.length > 0) {
    url.searchParams.set('topics', params.topics.join(','));
  }
  if (params?.sinceEventId) {
    url.searchParams.set('sinceEventId', params.sinceEventId);
  }
  return url.toString();
};

export const normalizeRealtimeEnvelope = (raw: unknown, fallbackTopic?: string): RealtimeEnvelope => {
  if (!raw || typeof raw !== 'object') {
    return { topic: fallbackTopic, data: raw };
  }

  const candidate = raw as SseEventEnvelope<Record<string, unknown>>;
  const eventType = typeof candidate.eventType === 'string' ? candidate.eventType : undefined;

  return {
    eventId: typeof candidate.eventId === 'string' ? candidate.eventId : undefined,
    topic: mapEventTypeToTopic(eventType, fallbackTopic),
    eventName: eventType,
    eventType,
    timestamp:
      typeof candidate.sourceTs === 'string'
        ? candidate.sourceTs
        : typeof candidate.receivedAt === 'string'
        ? candidate.receivedAt
        : undefined,
    data: candidate.payload,
    machineId: typeof candidate.machineId === 'string' ? candidate.machineId : undefined,
    machineCode: typeof candidate.machineCode === 'string' ? candidate.machineCode : undefined,
    sequence: typeof candidate.sequence === 'number' ? candidate.sequence : undefined,
    quality: typeof candidate.quality === 'number' ? candidate.quality : null,
  };
};
