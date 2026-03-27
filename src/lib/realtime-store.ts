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

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastEventId: (id: string | null) => void;
  setLastMessageAt: (at: string | null) => void;
  setConnectionError: (err: string | null) => void;
  incrementReconnectCount: () => void;
  resetReconnectCount: () => void;

  /** Cập nhật snapshot của một máy (patch, không replace toàn bộ) */
  patchMachineSnapshot: (machineId: string, patch: Partial<Machine>) => void;

  /** Append điểm telemetry vào time-series buffer của máy, trim theo MAX_SERIES_POINTS */
  appendTelemetryPoint: (machineId: string, point: TelemetryPoint) => void;

  /** Seed lịch sử ban đầu (từ REST history endpoint) */
  seedTelemetrySeries: (machineId: string, points: TelemetryPoint[]) => void;

  /** Thêm alarm event vào đầu danh sách */
  addAlarmEvent: (event: MachineEvent) => void;

  /** Lấy series của một máy trong khoảng thời gian */
  getSeriesWindow: (machineId: string, fromMs: number) => TelemetryPoint[];
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
}));

