import { appEnv } from '@/lib/config/env';
import type { SseEventEnvelope } from '@/types/api';

export type RealtimeTopic = 'telemetry' | 'alarm' | 'connection' | 'machine.connection' | 'heartbeat' | 'all';

export const namedRealtimeEvents = [
  'machine-telemetry-updated',
  'alarm-created',
  'alarm-updated',
  'downtime-created',
  'machine-connection-changed',
  'heartbeat.ping',
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
  sequence?: number;
  quality?: string;
}

const mapEventTypeToTopic = (eventType?: string, fallbackTopic?: string): string | undefined => {
  if (!eventType) return fallbackTopic;
  if (eventType.startsWith('machine-telemetry') || eventType.startsWith('telemetry')) return 'telemetry';
  if (eventType.startsWith('machine-connection') || eventType.startsWith('machine.connection')) return 'connection';
  if (eventType === 'heartbeat.ping' || eventType === 'heartbeat') return 'heartbeat';
  if (eventType.startsWith('telemetry')) return 'telemetry';
  if (eventType.startsWith('alarm')) return 'alarm';
  if (eventType.startsWith('machine.connection')) return 'connection';
  if (eventType === 'heartbeat') return 'connection';
  return fallbackTopic || eventType;
};

export const buildRealtimeStreamUrl = (params?: {
  machineId?: string;
  topics?: RealtimeTopic[];
  sinceEventId?: string;
}) => {
  const url = new URL('/api/v1/realtime/stream/v2', appEnv.apiBaseUrl);
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
    sequence: typeof candidate.sequence === 'number' ? candidate.sequence : undefined,
    quality: typeof candidate.quality === 'string' ? candidate.quality : undefined,
  };
};

