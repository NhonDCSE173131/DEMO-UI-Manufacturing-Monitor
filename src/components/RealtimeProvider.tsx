'use client';

/**
 * RealtimeProvider - App-shell component
 * Mở MỘT EventSource duy nhất cho toàn bộ ứng dụng.
 * Không bao giờ đóng kết nối khi người dùng đổi trang.
 * Dispatch events vào useRealtimeStore.
 */

import { useEffect, useRef } from 'react';
import { buildRealtimeStreamUrl, namedRealtimeEvents, normalizeRealtimeEnvelope } from '@/lib/api/realtime';
import { appEnv } from '@/lib/config/env';
import { useRealtimeStore, type TelemetryPoint } from '@/lib/realtime-store';
import { mapRealtimeTelemetryPatch, pruneUndefinedPatch } from '@/lib/mappers/realtime.mapper';
import { mapApiAlarmToUi } from '@/lib/mappers/alarm.mapper';

const LAST_EVENT_ID_KEY = 'mm.realtime.lastEventId';
const MAX_RECONNECT_DELAY = 30_000;

function toSafeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function RealtimeProvider() {
  const {
    setConnectionStatus,
    setLastEventId,
    setLastMessageAt,
    setConnectionError,
    incrementReconnectCount,
    resetReconnectCount,
    patchMachineSnapshot,
    appendTelemetryPoint,
    addAlarmEvent,
  } = useRealtimeStore();

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (appEnv.useMock) {
      setConnectionStatus('idle');
      return;
    }

    const getStoredEventId = () =>
      typeof window !== 'undefined' ? window.sessionStorage.getItem(LAST_EVENT_ID_KEY) : null;

    const connect = (sinceEventId?: string | null) => {
      if (!mountedRef.current) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus(reconnectCountRef.current > 0 ? 'degraded' : 'connecting');
      const url = buildRealtimeStreamUrl({
        topics: ['telemetry', 'alarm', 'connection'],
        sinceEventId: sinceEventId || undefined,
      });
      try {
        const source = new EventSource(url);
        eventSourceRef.current = source;

        source.onopen = () => {
          if (!mountedRef.current) return;
          reconnectCountRef.current = 0;
          resetReconnectCount();
          setConnectionStatus('live');
          setConnectionError(null);
        };

        const handleMessage = (message: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const parsed = message.data ? JSON.parse(message.data as string) : null;
            const envelope = normalizeRealtimeEnvelope(parsed, message.type);
            const resolvedEventId = message.lastEventId || envelope.eventId || null;
            if (resolvedEventId) {
              setLastEventId(resolvedEventId);
              try { window.sessionStorage.setItem(LAST_EVENT_ID_KEY, resolvedEventId); } catch { /* ignore */ }
            }
            setLastMessageAt(new Date().toISOString());
            setConnectionStatus('live');

            const payload = (envelope.data && typeof envelope.data === 'object' ? envelope.data : {}) as Record<string, unknown>;
            const machineId = envelope.machineId || (typeof payload.machineId === 'string' ? payload.machineId : undefined);
            const topic = envelope.topic || envelope.eventName || '';

            if (machineId && (topic === 'telemetry' || topic === 'connection' || String(topic).startsWith('machine-telemetry') || String(topic).startsWith('machine-connection'))) {
              const patch = pruneUndefinedPatch(mapRealtimeTelemetryPatch(payload));
              if (Object.keys(patch).length > 0) patchMachineSnapshot(machineId, patch as never);
              const ts = String(payload.timestamp || payload.ts || envelope.timestamp || new Date().toISOString());
              const point: TelemetryPoint = {
                timestamp: ts,
                powerKw: toSafeNumber(payload.powerKw ?? payload.currentPowerKw),
                temperatureC: toSafeNumber(payload.temperatureC),
                vibrationMmS: toSafeNumber(payload.vibrationMmS ?? payload.vibrationPct),
                outputCount: toSafeNumber(payload.outputCount ?? payload.partCount),
                goodCount: toSafeNumber(payload.goodCount),
                rejectCount: toSafeNumber(payload.rejectCount ?? payload.ngCount),
                oee: toSafeNumber(payload.oee),
                availability: toSafeNumber(payload.availability),
                performance: toSafeNumber(payload.performance),
                quality: toSafeNumber(payload.quality),
              };
              appendTelemetryPoint(machineId, point);
            }

            if (topic === 'alarm' || String(topic).startsWith('alarm') || 'severity' in payload || 'title' in payload) {
              try {
                const event = mapApiAlarmToUi({ ...payload, machineId: machineId || (typeof payload.machineId === 'string' ? payload.machineId : undefined) });
                addAlarmEvent(event);
              } catch { /* ignore */ }
            }
          } catch {
            setConnectionError('Không phân tích được sự kiện realtime');
          }
        };

        source.onmessage = handleMessage;
        namedRealtimeEvents.forEach((n) => source.addEventListener(n, handleMessage as EventListener));

        source.onerror = () => {
          if (!mountedRef.current) return;
          source.close();
          eventSourceRef.current = null;
          reconnectCountRef.current += 1;
          incrementReconnectCount();
          setConnectionStatus('degraded');
          setConnectionError('Kết nối realtime bị gián đoạn, đang thử lại...');
          const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * Math.pow(2, Math.min(reconnectCountRef.current - 1, 4)));
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => connect(getStoredEventId()), delay);
        };
      } catch {
        setConnectionStatus('disconnected');
        setConnectionError('Không thể tạo kết nối EventSource');
      }
    };

    connect(getStoredEventId());

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      // Không đóng EventSource khi app unmount (provider này sống ở cấp app)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy một lần khi app mount

  return null;
}

