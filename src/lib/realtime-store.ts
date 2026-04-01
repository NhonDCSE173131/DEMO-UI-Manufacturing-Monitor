'use client';

/**
 * App-level Realtime Store
 * Quản lý toàn bộ state realtime ở cấp app:
 * - Một kết nối SSE duy nhất (không phải mỗi page một kết nối)
 * - Snapshot store: trạng thái hiện tại của từng máy
 * - Time-series store: lịch sử telemetry ring buffer 300 điểm / máy
 * - Event store: alarm / downtime events
 */

import { create } from 'zustand';
import type { ConnectionStateType, Machine, MachineEvent } from '@/types';

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'degraded' | 'disconnected';

/** Một điểm trong chuỗi thời gian telemetry */
export interface TelemetryPoint {
  timestamp: string;
  powerKw?: number;
  temperatureC?: number;
  vibrationPct?: number;
  vibrationMmS?: number;
  spindleSpeedRpm?: number;
  spindleRpm?: number;
  feedRateMmMin?: number;
  spindleLoadPct?: number;
  servoLoadPct?: number;
  cycleTimeSec?: number;
  idealCycleTimeSec?: number;
  cuttingSpeedMMin?: number;
  depthOfCutMm?: number;
  feedPerToothMm?: number;
  widthOfCutMm?: number;
  materialRemovalRateCm3Min?: number;
  weldingCurrentA?: number;
  outputCount?: number;
  partCount?: number;
  goodCount?: number;
  rejectCount?: number;
  ngCount?: number;
  machineState?: string;
  connectionStatus?: string;
  gapDetected?: boolean;
  missing?: boolean;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
}

// 1h raw 1s series + headroom for reconnect gaps.
const MAX_SERIES_POINTS = 5400;

interface RealtimeState {
  /** Trạng thái kết nối SSE */
  connectionStatus: ConnectionStatus;
  /** ID của event cuối cùng đã nhận (dùng khi reconnect) */
  lastEventId: string | null;
  /** ISO timestamp lần cuối nhận event */
  lastMessageAt: string | null;
  /** Lỗi kết nối hiện tại nếu có */
  connectionError: string | null;
  /** Số lần reconnect */
  reconnectCount: number;

  /** Snapshot store: trạng thái hiện tại của từng máy (machineId → Partial<Machine>) */
  snapshotsByMachineId: Record<string, Partial<Machine>>;

  /** Time-series store: chuỗi telemetry theo machineId */
  telemetrySeriesByMachineId: Record<string, TelemetryPoint[]>;

  /** Event store: alarm + downtime events mới nhất */
  realtimeAlarmEvents: MachineEvent[];

  /** Connection state per machine: ONLINE/STALE/OFFLINE/UNSTABLE */
  connectionStateByMachineId: Record<string, ConnectionStateType>;

  /** Last seen timestamp per machine */
  lastSeenByMachineId: Record<string, string>;

  /** Data freshness in seconds per machine */
  dataFreshnessByMachineId: Record<string, number>;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastEventId: (id: string | null) => void;
  setLastMessageAt: (at: string | null) => void;
  setConnectionError: (err: string | null) => void;
  incrementReconnectCount: () => void;
  resetReconnectCount: () => void;
  patchMachineSnapshot: (machineId: string, patch: Partial<Machine>) => void;
  appendTelemetryPoint: (machineId: string, point: TelemetryPoint) => void;
  seedTelemetrySeries: (machineId: string, points: TelemetryPoint[]) => void;
  addAlarmEvent: (event: MachineEvent) => void;
  getSeriesWindow: (machineId: string, fromMs: number) => TelemetryPoint[];
  setMachineConnectionState: (machineId: string, state: ConnectionStateType) => void;
  setMachineLastSeen: (machineId: string, ts: string) => void;
  setMachineDataFreshness: (machineId: string, freshnessSec: number) => void;

  /** Helper: kiểm tra máy có đang live không (app live AND máy online AND dữ liệu fresh) */
  isMachineLive: (machineId: string, freshnessSec?: number) => boolean;

  /** Helper: check xem có nên hiển thị live metrics không */
  shouldShowLiveMetrics: (machineId: string, freshnessSec?: number) => boolean;

  /** Selector: lấy live snapshot chuẩn hóa cho 1 máy */
  selectMachineLiveSnapshot: (machineId: string) => Partial<Machine> | undefined;

  /** Selector: lấy series window cho 1 máy */
  selectMachineSeries: (machineId: string, fromMs: number) => TelemetryPoint[];
}

export const useRealtimeStore = create<RealtimeState>()((set, get) => ({
  connectionStatus: 'idle',
  lastEventId: null,
  lastMessageAt: null,
  connectionError: null,
  reconnectCount: 0,
  snapshotsByMachineId: {},
  telemetrySeriesByMachineId: {},
  realtimeAlarmEvents: [],
  connectionStateByMachineId: {},
  lastSeenByMachineId: {},
  dataFreshnessByMachineId: {},

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLastEventId: (id) => set({ lastEventId: id }),
  setLastMessageAt: (at) => set({ lastMessageAt: at }),
  setConnectionError: (err) => set({ connectionError: err }),
  incrementReconnectCount: () => set((s) => ({ reconnectCount: s.reconnectCount + 1 })),
  resetReconnectCount: () => set({ reconnectCount: 0 }),

  patchMachineSnapshot: (machineId, patch) =>
    set((s) => ({
      snapshotsByMachineId: {
        ...s.snapshotsByMachineId,
        [machineId]: { ...s.snapshotsByMachineId[machineId], ...patch },
      },
    })),

  appendTelemetryPoint: (machineId, point) =>
    set((s) => {
      const existing = s.telemetrySeriesByMachineId[machineId] || [];
      // Tránh duplicate timestamp
      const filtered = existing.filter((p) => p.timestamp !== point.timestamp);
      const next = [...filtered, point].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      return {
        telemetrySeriesByMachineId: {
          ...s.telemetrySeriesByMachineId,
          [machineId]: next.slice(-MAX_SERIES_POINTS),
        },
      };
    }),

  seedTelemetrySeries: (machineId, points) =>
    set((s) => {
      const existing = s.telemetrySeriesByMachineId[machineId] || [];
      const merged = [...points, ...existing]
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .reduce<TelemetryPoint[]>((acc, p) => {
          if (acc.length === 0 || acc[acc.length - 1].timestamp !== p.timestamp) {
            acc.push(p);
          }
          return acc;
        }, []);
      return {
        telemetrySeriesByMachineId: {
          ...s.telemetrySeriesByMachineId,
          [machineId]: merged.slice(-MAX_SERIES_POINTS),
        },
      };
    }),

  addAlarmEvent: (event) =>
    set((s) => ({
      realtimeAlarmEvents: [event, ...s.realtimeAlarmEvents.filter((e) => e.id !== event.id)].slice(0, 200),
    })),

  getSeriesWindow: (machineId, fromMs) => {
    const series = get().telemetrySeriesByMachineId[machineId] || [];
    return series.filter((p) => new Date(p.timestamp).getTime() >= fromMs);
  },

  isMachineLive: (machineId, freshnessSec = 30) => {
    const state = get();
    // App phải ở trạng thái live hoặc connecting
    if (state.connectionStatus !== 'live' && state.connectionStatus !== 'connecting') return false;
    // ONLINE = live chuẩn, UNSTABLE = vẫn live nhưng cần cảnh báo ở UI.
    const connState = state.connectionStateByMachineId[machineId];
    if (!connState || (connState !== 'ONLINE' && connState !== 'UNSTABLE')) return false;
    // Dữ liệu phải còn fresh — UNSTABLE cho phép threshold cao hơn (45s)
    const freshness = state.dataFreshnessByMachineId[machineId];
    const effectiveThreshold = connState === 'UNSTABLE' ? Math.max(freshnessSec, 45) : freshnessSec;
    if (freshness !== undefined && freshness > effectiveThreshold) return false;
    // Chấp nhận snapshot hoặc đã có ít nhất 1 telemetry point.
    const snapshot = state.snapshotsByMachineId[machineId];
    const series = state.telemetrySeriesByMachineId[machineId] || [];
    if ((!snapshot || Object.keys(snapshot).length === 0) && series.length === 0) return false;
    return true;
  },

  shouldShowLiveMetrics: (machineId, freshnessSec = 30) => {
    const state = get();
    // Nếu app mất kết nối thì không hiện live
    if (state.connectionStatus !== 'live' && state.connectionStatus !== 'connecting') return false;
    // ONLINE/UNSTABLE đều có thể hiển thị live.
    const connState = state.connectionStateByMachineId[machineId];
    if (!connState || (connState !== 'ONLINE' && connState !== 'UNSTABLE')) return false;
    // Nếu dữ liệu quá cũ thì không hiện live — UNSTABLE cho phép 45s
    const freshness = state.dataFreshnessByMachineId[machineId];
    const effectiveThreshold = connState === 'UNSTABLE' ? Math.max(freshnessSec, 45) : freshnessSec;
    if (freshness !== undefined && freshness > effectiveThreshold) return false;
    // Chấp nhận snapshot hoặc đã có telemetry points.
    const snapshot = state.snapshotsByMachineId[machineId];
    const series = state.telemetrySeriesByMachineId[machineId] || [];
    if ((!snapshot || Object.keys(snapshot).length === 0) && series.length === 0) return false;
    return true;
  },

  setMachineConnectionState: (machineId, state) =>
    set((s) => ({
      connectionStateByMachineId: {
        ...s.connectionStateByMachineId,
        [machineId]: state,
      },
    })),

  setMachineLastSeen: (machineId, ts) =>
    set((s) => ({
      lastSeenByMachineId: {
        ...s.lastSeenByMachineId,
        [machineId]: ts,
      },
    })),

  setMachineDataFreshness: (machineId, freshnessSec) =>
    set((s) => ({
      dataFreshnessByMachineId: {
        ...s.dataFreshnessByMachineId,
        [machineId]: freshnessSec,
      },
    })),

  selectMachineLiveSnapshot: (machineId) => {
    const state = get();
    return state.snapshotsByMachineId[machineId];
  },

  selectMachineSeries: (machineId, fromMs) => {
    const series = get().telemetrySeriesByMachineId[machineId] || [];
    return series.filter((p) => new Date(p.timestamp).getTime() >= fromMs);
  },
}));

