'use client';

import { create } from 'zustand';
import type { Machine, MachineEvent, RawTelemetry, Tool } from '@/types';

export interface MachineStore {
  machines: Machine[];
  events: MachineEvent[];
  tools: Tool[];
  selectedLanguage: 'en' | 'vi';
  userRole: 'manager' | 'maintenance' | 'production';
  selectedShift: 'all' | 'shift_a' | 'shift_b' | 'shift_c';
  selectedAreaFilter: 'all' | string;
  selectedStatusFilter: 'all' | 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT';
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  setLanguage: (lang: 'en' | 'vi') => void;
  setUserRole: (role: 'manager' | 'maintenance' | 'production') => void;
  setShift: (shift: 'all' | 'shift_a' | 'shift_b' | 'shift_c') => void;
  setAreaFilter: (area: 'all' | string) => void;
  setStatusFilter: (status: 'all' | 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT') => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  updateMachineStatus: (machineId: string, updates: Partial<Machine>) => void;
  getMachine: (machineId: string) => Machine | undefined;
  addEvent: (event: MachineEvent) => void;
  clearOldEvents: () => void;
  resolveMaintenance: (machineId: string, payload?: { maintainer: string; timestamp: string; notes?: string }) => void;
  replaceTool: (toolId: string, payload?: { maintainer: string; timestamp: string; notes?: string }) => void;
  acknowledgeAlarms: (machineId: string) => void;
}

const mergeRawTelemetry = (machine: Machine, overrides: Partial<RawTelemetry> = {}): RawTelemetry => ({
  state: overrides.state ?? machine.rawTelemetry?.state ?? machine.status,
  mode: overrides.mode ?? machine.rawTelemetry?.mode ?? machine.mode,
  powerKw: overrides.powerKw ?? machine.rawTelemetry?.powerKw ?? machine.powerKw,
  temperatureC: overrides.temperatureC ?? machine.rawTelemetry?.temperatureC ?? machine.temperatureC,
  vibrationPct: overrides.vibrationPct ?? machine.rawTelemetry?.vibrationPct ?? machine.vibrationPct,
  spindleRpm: overrides.spindleRpm ?? machine.rawTelemetry?.spindleRpm ?? machine.spindleSpeedRpm,
  feedRateMmMin: overrides.feedRateMmMin ?? machine.rawTelemetry?.feedRateMmMin ?? machine.feedRateMmMin,
  servoLoadPct: overrides.servoLoadPct ?? machine.rawTelemetry?.servoLoadPct ?? machine.servoLoadPct,
  programName: overrides.programName ?? machine.rawTelemetry?.programName ?? machine.currentProgram,
});

export const useMachineStore = create<MachineStore>()((set, get) => ({
  machines: [],
  events: [],
  tools: [],
  selectedLanguage: 'vi',
  userRole: 'manager',
  selectedShift: 'all',
  selectedAreaFilter: 'all',
  selectedStatusFilter: 'all',
  isSidebarCollapsed: false,
  sidebarWidth: 256,
  setLanguage: (lang) => set({ selectedLanguage: lang }),
  setUserRole: (role) => set({ userRole: role }),
  setShift: (shift) => set({ selectedShift: shift }),
  setAreaFilter: (area) => set({ selectedAreaFilter: area }),
  setStatusFilter: (status) => set({ selectedStatusFilter: status }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  updateMachineStatus: (machineId, updates) =>
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId ? { ...m, ...updates } : m
      ),
    })),
  getMachine: (machineId: string) => {
    return get().machines.find((m) => m.id === machineId);
  },
  addEvent: (event: MachineEvent) => {
    set((state) => ({
      events: [event, ...state.events].slice(0, 100),
    }));
  },
  clearOldEvents: () =>
    set((state) => ({
      events: state.events.slice(0, 50),
    })),
  resolveMaintenance: (machineId, payload) =>
    set((state) => {
      const machine = state.machines.find(m => m.id === machineId);
      let newEvents = state.events;
      if (payload && machine) {
        const newEvent: MachineEvent = {
          id: `MNT_${Date.now()}`,
          machineId,
          timestamp: payload.timestamp,
          severity: 'info',
          title: 'Bảo trì hoàn thành',
          message: `Bảo trì bởi ${payload.maintainer}${payload.notes ? ` - ${payload.notes}` : ''}`,
          type: 'maintenance',
        };
        newEvents = [newEvent, ...state.events].slice(0, 100);
      }
      return {
        machines: state.machines.map((m) =>
          m.id === machineId
            ? {
                ...m,
                machineHealth: 100,
                anomalyScore: 0,
                status: m.status === 'FAULT' ? 'IDLE' : m.status,
                activeAlarms: 0,
                rawTelemetry: mergeRawTelemetry(m, { state: m.status === 'FAULT' ? 'IDLE' : m.status }),
                computedMetrics: { ...m.computedMetrics, healthScore: 100 },
                predictions: {
                  ...m.predictions,
                  maintenanceRisk: 'low' as const,
                },
              }
            : m
        ),
        events: newEvents,
      };
    }),
  replaceTool: (toolId, payload) =>
    set((state) => {
      const tool = state.tools.find(t => t.id === toolId);
      let newEvents = state.events;
      if (payload && tool) {
        const newEvent: MachineEvent = {
          id: `TL_${Date.now()}`,
          machineId: tool.machineId,
          timestamp: payload.timestamp,
          severity: 'info',
          title: 'Thay dụng cụ',
          message: `Dụng cụ ${tool.name} được thay bởi ${payload.maintainer}${payload.notes ? ` - ${payload.notes}` : ''}`,
          type: 'maintenance',
        };
        newEvents = [newEvent, ...state.events].slice(0, 100);
      }
      return {
        tools: state.tools.map((t) =>
          t.id === toolId
            ? {
                ...t,
                remainingLifePct: 100,
                usageTimeHours: 0,
                lastReplacedDate: payload ? payload.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
              }
            : t
        ),
        machines: state.machines.map(m => {
          if (tool && m.id === tool.machineId) {
            return {
              ...m,
              toolLifeRemainingPct: 100,
              predictions: { ...m.predictions, remainingToolLifePct: 100 },
            };
          }
          return m;
        }),
        events: newEvents,
      };
    }),
  acknowledgeAlarms: (machineId) =>
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId
          ? {
              ...m,
              activeAlarms: 0,
              status: m.status === 'FAULT' ? 'IDLE' : m.status,
              anomalyScore: 0,
              rawTelemetry: mergeRawTelemetry(m, { state: m.status === 'FAULT' ? 'IDLE' : m.status }),
            }
          : m
      ),
      events: state.events.filter(e => e.machineId !== machineId || e.severity === 'info'),
    })),
}));
