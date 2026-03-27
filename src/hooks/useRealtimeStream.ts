import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRealtimeStreamUrl,
  namedRealtimeEvents,
  normalizeRealtimeEnvelope,
  type RealtimeEnvelope,
  type RealtimeTopic,
} from '@/lib/api/realtime';
import { appEnv } from '@/lib/config/env';

const LAST_EVENT_ID_STORAGE_KEY = 'mm.realtime.lastEventId';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'degraded' | 'disconnected';

interface UseRealtimeStreamOptions {
  enabled?: boolean;
  machineId?: string;
  topics: RealtimeTopic[];
  onEvent?: (event: RealtimeEnvelope) => void;
}

export const useRealtimeStream = ({ enabled = true, machineId, topics, onEvent }: UseRealtimeStreamOptions) => {
  const [status, setStatus] = useState<StreamStatus>(enabled && !appEnv.useMock ? 'connecting' : 'idle');
  const [lastEventId, setLastEventId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(LAST_EVENT_ID_STORAGE_KEY);
  });
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const onEventRef = useRef(onEvent);
  const lastEventIdRef = useRef<string | null>(null);

  onEventRef.current = onEvent;
  lastEventIdRef.current = lastEventId;

  useEffect(() => {
    if (!enabled || appEnv.useMock || topics.length === 0) {
      setStatus('idle');
      return;
    }

    let isCancelled = false;

    const cleanup = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };

    const connect = () => {
      if (isCancelled) return;
      cleanup();
      setStatus(reconnectAttemptRef.current > 0 ? 'degraded' : 'connecting');

      const url = buildRealtimeStreamUrl({ machineId, topics, sinceEventId: lastEventIdRef.current || undefined });
      const source = new EventSource(url);
      eventSourceRef.current = source;

      source.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus('live');
        setError(null);
      };

      const processMessage = (message: MessageEvent) => {
        try {
          const parsed = message.data ? JSON.parse(message.data) : null;
          const envelope = normalizeRealtimeEnvelope(parsed, message.type);
          const resolvedEventId = message.lastEventId || envelope.eventId || null;
          if (resolvedEventId) {
            setLastEventId(resolvedEventId);
            window.sessionStorage.setItem(LAST_EVENT_ID_STORAGE_KEY, resolvedEventId);
          }
          setLastMessageAt(new Date().toISOString());
          setStatus('live');
          onEventRef.current?.(envelope);
        } catch {
          setError('Khong phan tich duoc su kien realtime');
        }
      };

      source.onmessage = processMessage;
      namedRealtimeEvents.forEach((eventName) => {
        source.addEventListener(eventName, processMessage as EventListener);
      });

      source.onerror = () => {
        source.close();
        reconnectAttemptRef.current += 1;
        setStatus('degraded');
        setError('Ket noi realtime bi gian doan');
        const delay = Math.min(10000, 1000 * 2 ** Math.min(reconnectAttemptRef.current, 3));
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      isCancelled = true;
      cleanup();
      setStatus('disconnected');
    };
  }, [enabled, machineId, topics]);

  return useMemo(
    () => ({
      status,
      lastEventId,
      lastMessageAt,
      error,
      isLive: status === 'live',
      isEnabled: enabled && !appEnv.useMock,
    }),
    [enabled, error, lastEventId, lastMessageAt, status],
  );
};


