'use client';

/**
 * RealtimeProvider - App-shell component
 * Mở MỘT EventSource duy nhất cho toàn bộ ứng dụng.
 * Không bao giờ đóng kết nối khi người dùng đổi trang.
 * Dispatch events vào useRealtimeStore.
 *
 * Theo BE-API-DOCUMENTATION:
 * - SSE endpoint: /api/v1/realtime/stream
 * - Event chính: snapshot.updated (mỗi 1 giây)
 * - Payload shape: MachineRealtimeSnapshotResponse
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

      console.log('[RealtimeProvider] Connecting to SSE:', url);
      console.log('[RealtimeProvider] API Base URL from env:', process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080 (default)');

      // Kiểm tra URL hợp lệ
      try {
        new URL(url);
      } catch {
        console.error('[RealtimeProvider] Invalid SSE URL:', url);
        setConnectionStatus('disconnected');
        setConnectionError('URL SSE không hợp lệ');
        return;
      }

      try {
        const source = new EventSource(url);
        eventSourceRef.current = source;

        source.onopen = () => {
          if (!mountedRef.current) return;
          console.log('[RealtimeProvider] SSE connection opened');
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

            // Debug log để kiểm tra event nhận được
            console.log('[RealtimeProvider] Event received:', {
              type: message.type,
              eventType: envelope.eventType,
              topic: envelope.topic,
              machineId: envelope.machineId,
            });

            const resolvedEventId = message.lastEventId || envelope.eventId || null;
            if (resolvedEventId) {
              setLastEventId(resolvedEventId);
              try { window.sessionStorage.setItem(LAST_EVENT_ID_KEY, resolvedEventId); } catch { /* ignore */ }
            }
            setLastMessageAt(new Date().toISOString());
            setConnectionStatus('live');

            const payload = (envelope.data && typeof envelope.data === 'object' ? envelope.data : {}) as Record<string, unknown>;
            const machineId = envelope.machineId || (typeof payload.machineId === 'string' ? payload.machineId : undefined);
            const topic = envelope.topic || '';
            const eventType = envelope.eventType || '';

            // snapshot.updated hoặc telemetry.updated → cập nhật snapshot + chart
            const isSnapshotEvent = topic === 'snapshot' || eventType === 'snapshot.updated';
            const isTelemetryEvent = topic === 'telemetry' || eventType === 'telemetry.updated';
            const isConnectionEvent = topic === 'connection' || eventType.startsWith('machine.connection');
            const isAlarmEvent = topic === 'alarm' || eventType.startsWith('alarm.');
            const isHeartbeat = topic === 'heartbeat' || eventType === 'heartbeat';

            // Heartbeat: chỉ cần log, không làm gì thêm
            if (isHeartbeat) {
              console.log('[RealtimeProvider] Heartbeat received');
              return;
            }

            // Connection events: cập nhật trạng thái kết nối máy
            if (machineId && isConnectionEvent) {
              const unstableFlag = payload.connectionUnstable === true;
              const connectionStateRaw =
                payload.connectionState ??
                payload.to ?? // machine.connection.changed có field "to"
                payload.state;
              const connectionState = typeof connectionStateRaw === 'string' ? connectionStateRaw.toUpperCase() : '';
              const effectiveConnectionState = unstableFlag ? 'UNSTABLE' : connectionState;

              if (effectiveConnectionState === 'ONLINE' || effectiveConnectionState === 'STALE' || effectiveConnectionState === 'OFFLINE' || effectiveConnectionState === 'UNSTABLE') {
                console.log(`[RealtimeProvider] Connection changed: ${machineId} → ${effectiveConnectionState}`);
                setMachineConnectionState(machineId, effectiveConnectionState);
                patchMachineSnapshot(machineId, {
                  connectionState: effectiveConnectionState,
                  connectionUnstable: unstableFlag,
                  displayState: payload.displayState as string || effectiveConnectionState,
                } as never);
              }

              const lastSeenTsRaw = payload.lastSeenAt ?? payload.lastSeen;
              if (typeof lastSeenTsRaw === 'string' && lastSeenTsRaw.trim() !== '') {
                setMachineLastSeen(machineId, lastSeenTsRaw);
              }

              const freshnessSec = toSafeNumber(payload.dataFreshnessSec);
              if (typeof freshnessSec === 'number') {
                setMachineDataFreshness(machineId, freshnessSec);
              }
            }

            // Snapshot / Telemetry events: cập nhật snapshot + chart data
            if (machineId && (isSnapshotEvent || isTelemetryEvent)) {
              // 1. Cập nhật connection state từ snapshot
              const unstableFlag = payload.connectionUnstable === true;
              const connectionStateRaw = payload.connectionState;
              const connectionState = typeof connectionStateRaw === 'string' ? connectionStateRaw.toUpperCase() : '';
              const effectiveConnectionState = unstableFlag ? 'UNSTABLE' : connectionState;

              if (effectiveConnectionState === 'ONLINE' || effectiveConnectionState === 'STALE' || effectiveConnectionState === 'OFFLINE' || effectiveConnectionState === 'UNSTABLE') {
                setMachineConnectionState(machineId, effectiveConnectionState);
              }

              const lastSeenTsRaw = payload.lastSeenAt;
              if (typeof lastSeenTsRaw === 'string' && lastSeenTsRaw.trim() !== '') {
                setMachineLastSeen(machineId, lastSeenTsRaw);
              }

              const freshnessSec = toSafeNumber(payload.dataFreshnessSec);
              if (typeof freshnessSec === 'number') {
                setMachineDataFreshness(machineId, freshnessSec);
              }

              // 2. Patch snapshot với toàn bộ dữ liệu telemetry
              const patch = pruneUndefinedPatch(mapRealtimeTelemetryPatch(payload));
              if (Object.keys(patch).length > 0) {
                patchMachineSnapshot(machineId, patch as never);
              }

              // 3. Append telemetry point cho chart
              const ts = String(payload.ts || payload.timestamp || envelope.timestamp || new Date().toISOString());
              const point: TelemetryPoint = {
                timestamp: ts,
                powerKw: toSafeNumber(payload.powerKw),
                temperatureC: toSafeNumber(payload.temperatureC),
                vibrationPct: toSafeNumber(payload.vibrationMmS), // BE dùng vibrationMmS
                vibrationMmS: toSafeNumber(payload.vibrationMmS),
                spindleSpeedRpm: toSafeNumber(payload.spindleSpeedRpm),
                spindleRpm: toSafeNumber(payload.spindleSpeedRpm),
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
                outputCount: toSafeNumber(payload.outputCount),
                partCount: toSafeNumber(payload.outputCount), // BE dùng outputCount
                goodCount: toSafeNumber(payload.goodCount),
                rejectCount: toSafeNumber(payload.rejectCount),
                ngCount: toSafeNumber(payload.rejectCount), // BE dùng rejectCount
                machineState: typeof payload.operationalState === 'string' ? payload.operationalState : undefined,
                connectionStatus: typeof payload.connectionState === 'string' ? payload.connectionState : undefined,
                gapDetected: typeof payload.gapDetected === 'boolean' ? payload.gapDetected : undefined,
                missing: typeof payload.missing === 'boolean' ? payload.missing : undefined,
                oee: toSafeNumber(payload.oee),
                availability: toSafeNumber(payload.availability),
                performance: toSafeNumber(payload.performance),
                quality: toSafeNumber(payload.quality),
              };

              // Kiểm tra có ít nhất 1 metric số để append
              const hasNumericMetric =
                typeof point.powerKw === 'number' ||
                typeof point.temperatureC === 'number' ||
                typeof point.vibrationMmS === 'number' ||
                typeof point.spindleSpeedRpm === 'number' ||
                typeof point.feedRateMmMin === 'number' ||
                typeof point.spindleLoadPct === 'number' ||
                typeof point.servoLoadPct === 'number' ||
                typeof point.cycleTimeSec === 'number' ||
                typeof point.outputCount === 'number' ||
                typeof point.goodCount === 'number' ||
                typeof point.rejectCount === 'number' ||
                typeof point.oee === 'number' ||
                typeof point.availability === 'number' ||
                typeof point.performance === 'number' ||
                typeof point.quality === 'number';

              if (hasNumericMetric) {
                appendTelemetryPoint(machineId, point);
              }
            }

            // Alarm events
            if (isAlarmEvent && (machineId || payload.machineId)) {
              try {
                const event = mapApiAlarmToUi({
                  ...payload,
                  machineId: machineId || (typeof payload.machineId === 'string' ? payload.machineId : undefined),
                });
                addAlarmEvent(event);
              } catch { /* ignore */ }
            }
          } catch (err) {
            console.error('[RealtimeProvider] Error parsing event:', err);
            setConnectionError('Không phân tích được sự kiện realtime');
          }
        };

        // Lắng nghe onmessage (default event)
        source.onmessage = handleMessage;

        // Lắng nghe named events theo BE documentation
        namedRealtimeEvents.forEach((eventName) => {
          source.addEventListener(eventName, handleMessage as EventListener);
        });

        source.onerror = () => {
          if (!mountedRef.current) return;
          // Ignore callbacks from stale EventSource instances that were already replaced.
          if (source !== eventSourceRef.current) return;
          
          // EventSource errors don't provide useful info, check readyState
          const readyState = source.readyState;
          const stateNames = ['CONNECTING', 'OPEN', 'CLOSED'];
          const stateName = stateNames[readyState] || 'UNKNOWN';
          
          // onerror is expected during transient reconnects; keep it as warning to avoid noisy error overlays.
          console.warn('[RealtimeProvider] SSE connection issue:', {
            readyState,
            stateName,
            url,
            hint: readyState === 2 
              ? 'Connection closed - Backend có thể chưa chạy hoặc CORS chưa cấu hình'
              : 'Connection error - Kiểm tra network và backend'
          });

          source.close();
          eventSourceRef.current = null;
          reconnectCountRef.current += 1;
          incrementReconnectCount();
          setConnectionStatus('degraded');
          
          // Tạo error message rõ ràng hơn
          const errorMsg = reconnectCountRef.current === 1
            ? `Không thể kết nối SSE tới ${url}. Kiểm tra backend có đang chạy không.`
            : `Kết nối realtime bị gián đoạn (lần ${reconnectCountRef.current}), đang thử lại...`;
          setConnectionError(errorMsg);
          
          const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * Math.pow(2, Math.min(reconnectCountRef.current - 1, 4)));
          console.log(`[RealtimeProvider] Will reconnect in ${delay}ms`);
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => connect(getStoredEventId()), delay);
        };
      } catch (err) {
        console.error('[RealtimeProvider] Failed to create EventSource:', err);
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


