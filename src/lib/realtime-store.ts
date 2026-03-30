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
import type { Machine, MachineEvent } from '@/types';

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'degraded' | 'disconnected';

/** Một điểm trong chuỗi thời gian telemetry */
export interface TelemetryPoint {
  timestamp: string;
  powerKw?: number;
  temperatureC?: number;
  vibrationMmS?: number;
  outputCount?: number;
  goodCount?: number;
  rejectCount?: number;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
}

const MAX_SERIES_POINTS = 300;

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
  connectionStateByMachineId: Record<string, string>;

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
  setMachineConnectionState: (machineId: string, state: string) => void;
  setMachineLastSeen: (machineId: string, ts: string) => void;
  setMachineDataFreshness: (machineId: string, freshnessSec: number) => void;

  /** Helper: kiểm tra máy có đang live không (app live AND máy online AND dữ liệu fresh) */
  isMachineLive: (machineId: string, freshnessSec?: number) => boolean;

  /** Helper: check xem có nên hiển thị live metrics không */
  shouldShowLiveMetrics: (machineId: string, freshnessSec?: number) => boolean;
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
    // Quan trọng: Máy phải có connectionState = ONLINE
    // Nếu không có thông tin connectionState → coi như OFFLINE (chưa có dữ liệu PLC)
    const connState = state.connectionStateByMachineId[machineId];
    if (!connState || connState !== 'ONLINE') return false;
    // Dữ liệu phải còn fresh
    const freshness = state.dataFreshnessByMachineId[machineId];
    if (freshness !== undefined && freshness > freshnessSec) return false;
    // Phải đã nhận ít nhất 1 snapshot cho máy này
    const snapshot = state.snapshotsByMachineId[machineId];
    if (!snapshot || Object.keys(snapshot).length === 0) return false;
    return true;
  },

  shouldShowLiveMetrics: (machineId, freshnessSec = 30) => {
    const state = get();
    // Nếu app mất kết nối thì không hiện live
    if (state.connectionStatus !== 'live' && state.connectionStatus !== 'connecting') return false;
    // Nếu máy không có connectionState ONLINE → không hiện live
    const connState = state.connectionStateByMachineId[machineId];
    if (!connState || connState !== 'ONLINE') return false;
    // Nếu dữ liệu quá cũ thì không hiện live
    const freshness = state.dataFreshnessByMachineId[machineId];
    if (freshness !== undefined && freshness > freshnessSec) return false;
    // Phải đã nhận ít nhất 1 snapshot
    const snapshot = state.snapshotsByMachineId[machineId];
    if (!snapshot || Object.keys(snapshot).length === 0) return false;
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
}));

