'use client';

/**
 * RealtimeProvider - App-shell component
 * Mở MỘT EventSource duy nhất cho toàn bộ ứng dụng.
 * Không bao giờ đóng kết nối khi người dùng đổi trang.
 * Dispatch events vào useRealtimeStore.
 */

import { useEffect, useRef } from 'react';
import { buildRealtimeStreamUrl, namedRealtimeEvents, normalizeRealtimeEnvelope } from '@/lib/api/realtime';
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
    setMachineConnectionState,
    setMachineLastSeen,
    setMachineDataFreshness,
  } = useRealtimeStore();

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

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

            const isTelemetryTopic = topic === 'telemetry' || String(topic).startsWith('machine-telemetry');
            const isConnectionTopic = topic === 'connection' || String(topic).startsWith('machine-connection');

            if (machineId && (isTelemetryTopic || isConnectionTopic)) {
              const connectionStateRaw = payload.connectionState ?? payload.connection_status ?? payload.connection;
              const connectionState = typeof connectionStateRaw === 'string' ? connectionStateRaw.toUpperCase() : '';
              if (connectionState === 'ONLINE' || connectionState === 'STALE' || connectionState === 'OFFLINE' || connectionState === 'UNSTABLE') {
                setMachineConnectionState(machineId, connectionState);
              }

              const lastSeenTsRaw = payload.lastSeenAt ?? payload.lastSeen;
              if (typeof lastSeenTsRaw === 'string' && lastSeenTsRaw.trim() !== '') {
                setMachineLastSeen(machineId, lastSeenTsRaw);
              }

              const freshnessSec = toSafeNumber(payload.dataFreshnessSec ?? payload.freshness);
              if (typeof freshnessSec === 'number') {
                setMachineDataFreshness(machineId, freshnessSec);
              }
            }

            if (machineId && isTelemetryTopic) {
              const patch = pruneUndefinedPatch(mapRealtimeTelemetryPatch(payload));
              if (Object.keys(patch).length > 0) patchMachineSnapshot(machineId, patch as never);

              const ts = String(payload.timestamp || payload.ts || envelope.timestamp || new Date().toISOString());
              const point: TelemetryPoint = {
                timestamp: ts,
                powerKw: toSafeNumber(payload.powerKw ?? payload.currentPowerKw),
                temperatureC: toSafeNumber(payload.temperatureC),
                vibrationPct: toSafeNumber(payload.vibrationPct),
                vibrationMmS: toSafeNumber(payload.vibrationMmS ?? payload.vibrationPct),
                spindleSpeedRpm: toSafeNumber(payload.spindleSpeedRpm ?? payload.spindleRpm),
                spindleRpm: toSafeNumber(payload.spindleRpm ?? payload.spindleSpeedRpm),
                feedRateMmMin: toSafeNumber(payload.feedRateMmMin),
                spindleLoadPct: toSafeNumber(payload.spindleLoadPct),
                servoLoadPct: toSafeNumber(payload.servoLoadPct),
                cycleTimeSec: toSafeNumber(payload.cycleTimeSec),
                idealCycleTimeSec: toSafeNumber(payload.idealCycleTimeSec),
                cuttingSpeedMMin: toSafeNumber(payload.cuttingSpeedMMin),
                depthOfCutMm: toSafeNumber(payload.depthOfCutMm),
                feedPerToothMm: toSafeNumber(payload.feedPerToothMm),
                widthOfCutMm: toSafeNumber(payload.widthOfCutMm),
                materialRemovalRateCm3Min: toSafeNumber(payload.materialRemovalRateCm3Min),
                weldingCurrentA: toSafeNumber(payload.weldingCurrentA),
                outputCount: toSafeNumber(payload.outputCount ?? payload.partCount),
                partCount: toSafeNumber(payload.partCount ?? payload.outputCount),
                goodCount: toSafeNumber(payload.goodCount),
                rejectCount: toSafeNumber(payload.rejectCount ?? payload.ngCount),
                ngCount: toSafeNumber(payload.ngCount ?? payload.rejectCount),
                machineState: typeof payload.machineState === 'string' ? payload.machineState : undefined,
                connectionStatus: typeof payload.connectionStatus === 'string' ? payload.connectionStatus : undefined,
                gapDetected: typeof payload.gapDetected === 'boolean' ? payload.gapDetected : undefined,
                missing: typeof payload.missing === 'boolean' ? payload.missing : undefined,
                oee: toSafeNumber(payload.oee),
                availability: toSafeNumber(payload.availability),
                performance: toSafeNumber(payload.performance),
                quality: toSafeNumber(payload.quality),
              };

              const hasNumericMetric =
                typeof point.powerKw === 'number' ||
                typeof point.temperatureC === 'number' ||
                typeof point.vibrationPct === 'number' ||
                typeof point.vibrationMmS === 'number' ||
                typeof point.spindleSpeedRpm === 'number' ||
                typeof point.spindleRpm === 'number' ||
                typeof point.feedRateMmMin === 'number' ||
                typeof point.spindleLoadPct === 'number' ||
                typeof point.servoLoadPct === 'number' ||
                typeof point.cycleTimeSec === 'number' ||
                typeof point.idealCycleTimeSec === 'number' ||
                typeof point.cuttingSpeedMMin === 'number' ||
                typeof point.depthOfCutMm === 'number' ||
                typeof point.feedPerToothMm === 'number' ||
                typeof point.widthOfCutMm === 'number' ||
                typeof point.materialRemovalRateCm3Min === 'number' ||
                typeof point.weldingCurrentA === 'number' ||
                typeof point.outputCount === 'number' ||
                typeof point.partCount === 'number' ||
                typeof point.goodCount === 'number' ||
                typeof point.rejectCount === 'number' ||
                typeof point.ngCount === 'number' ||
                typeof point.oee === 'number' ||
                typeof point.availability === 'number' ||
                typeof point.performance === 'number' ||
                typeof point.quality === 'number';

              if (hasNumericMetric) {
                appendTelemetryPoint(machineId, point);
              }
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

