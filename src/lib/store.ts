'use client';

import { create } from 'zustand';
import type { Machine, MachineEvent, RawTelemetry, Tool } from '@/types';
import { mockMachines, generateMockEvents, mockTools } from './mock-data';
import { appEnv } from './config/env';

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

// Simulate real-time updates
const simulateRealTimeUpdates = (set: any, _get: any) => {
  if (!appEnv.useMock) return;
  if (typeof window === 'undefined') return;
  
  setInterval(() => {
    set((state: MachineStore) => {
      const updatedMachines = state.machines.map((machine) => {
        // Simulate realistic parameter changes
        if (machine.status === 'RUN') {
          const variation = () => (Math.random() - 0.5) * 0.1;

          // Sản xuất: khi tạo thêm part, nó phải là good HOẶC ng, không được tăng độc lập
          const newPartProduced = Math.random() > 0.95;
          let newPartCount = machine.partCount;
          let newGoodCount = machine.goodCount;
          let newNgCount = machine.ngCount;
          if (newPartProduced) {
            newPartCount += 1;
            // ~97% sản phẩm tốt, ~3% lỗi
            if (Math.random() > 0.97) {
              newNgCount += 1;
            } else {
              newGoodCount += 1;
            }
          }

          return {
            ...machine,
            powerKw: Math.max(0.5, machine.powerKw + machine.powerKw * variation()),
            energyTodayKwh: machine.energyTodayKwh + machine.powerKw / 120, // Every 30s update
            partCount: newPartCount,
            goodCount: newGoodCount,
            ngCount: newNgCount,
            oee: Math.min(
              100,
              Math.max(
                machine.availability * machine.performance * machine.quality * 0.01,
                0
              )
            ),
            spindleLoadPct: machine.spindleLoadPct !== undefined
              ? Math.min(100, Math.max(0, machine.spindleLoadPct + variation() * 30))
              : undefined,
            spindleSpeedRpm: machine.spindleSpeedRpm !== undefined
              ? Math.round(machine.spindleSpeedRpm + (Math.random() * 20 - 10))
              : undefined,
            temperatureC: machine.temperatureC !== undefined
              ? Math.min(
                  95,
                  Math.max(
                    25,
                    machine.temperatureC + (Math.random() - 0.5) * 5
                  )
                )
              : undefined,
            vibrationPct: machine.vibrationPct !== undefined
              ? Math.min(
                  100,
                  Math.max(0, machine.vibrationPct + variation() * 20)
                )
              : undefined,
            anomalyScore: Math.min(1, Math.max(0, machine.anomalyScore + variation() * 0.05)),
            rawTelemetry: mergeRawTelemetry(machine, {
              state: machine.status,
              mode: machine.mode,
              powerKw: Math.max(0.5, machine.powerKw + machine.powerKw * variation()),
              temperatureC: machine.temperatureC,
              vibrationPct: machine.vibrationPct,
              spindleRpm: machine.spindleSpeedRpm,
              feedRateMmMin: machine.feedRateMmMin,
              servoLoadPct: machine.servoLoadPct,
              programName: machine.currentProgram,
            }),
            computedMetrics: {
              ...machine.computedMetrics,
              oee: Math.min(
                100,
                Math.max(
                  machine.availability * machine.performance * machine.quality * 0.01,
                  0
                )
              ),
              availability: machine.availability,
              performance: machine.performance,
              quality: machine.quality,
              healthScore: machine.machineHealth,
            },
            predictions: {
              ...machine.predictions,
              remainingToolLifePct: machine.toolLifeRemainingPct,
              maintenanceRisk: (
                machine.maintenanceDueDays <= 7
                  ? 'high'
                  : machine.maintenanceDueDays <= 14
                  ? 'medium'
                  : 'low'
              ) as 'low' | 'medium' | 'high',
            },
          };
        } else if (machine.status === 'IDLE') {
          return {
            ...machine,
            powerKw: Math.max(1, machine.powerKw * 0.9), // Reduce power when idle
            spindleLoadPct: machine.spindleLoadPct !== undefined ? 0 : undefined,
            temperatureC: machine.temperatureC !== undefined ? Math.max(25, machine.temperatureC - 0.5) : undefined,
            vibrationPct: machine.vibrationPct !== undefined ? 0 : undefined,
            rawTelemetry: mergeRawTelemetry(machine, {
              state: machine.status,
              mode: machine.mode,
              powerKw: Math.max(1, machine.powerKw * 0.9),
              temperatureC: machine.temperatureC !== undefined ? Math.max(25, machine.temperatureC - 0.5) : machine.temperatureC,
              vibrationPct: 0,
              spindleRpm: machine.spindleSpeedRpm,
              feedRateMmMin: machine.feedRateMmMin,
              servoLoadPct: 0,
              programName: machine.currentProgram,
            }),
          };
        }

        return machine;
      });

      // Randomly trigger some status changes
      if (Math.random() > 0.98) {
        const randomMachine = Math.floor(Math.random() * updatedMachines.length);
        if (updatedMachines[randomMachine].status === 'RUN') {
          // Very rare: trigger a fault
          if (Math.random() > 0.95) {
            updatedMachines[randomMachine] = {
              ...updatedMachines[randomMachine],
              status: 'FAULT',
              anomalyScore: 0.85,
              activeAlarms: updatedMachines[randomMachine].activeAlarms + 1,
              rawTelemetry: mergeRawTelemetry(updatedMachines[randomMachine], { state: 'FAULT' }),
            };

            // Add critical event
            const newEvent: MachineEvent = {
              id: `E_${Date.now()}`,
              machineId: updatedMachines[randomMachine].id,
              timestamp: new Date().toISOString(),
              type: 'critical',
              severity: 'critical',
              title: 'Unexpected Machine Failure',
              message: 'Machine has encountered a critical fault',
              cause: 'Sensor malfunction',
              startTime: new Date().toISOString(),
              plannedType: 'unplanned',
              acknowledged: false,
              stopReasonCode: 'SENSOR_FAULT',
            };
            state.addEvent(newEvent);
          }
        }
      }

      return { machines: updatedMachines };
    });
  }, 2000); // Update every 2 seconds
};

export const useMachineStore = create<MachineStore>()((set, get) => {
  // Start simulation loop (client only)
  simulateRealTimeUpdates(set, get);

  return {
    machines: appEnv.useMock ? mockMachines : [],
    events: appEnv.useMock ? generateMockEvents() : [],
    tools: appEnv.useMock ? (mockTools || []) : [],
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
        events: [event, ...state.events].slice(0, 100), // Keep last 100 events
      }));
    },
    clearOldEvents: () =>
      set((state) => {
        // Keep last 50 events
        return {
          events: state.events.slice(0, 50),
        };
      }),
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
            title: 'Maintenance Completed',
            message: `Maintained by ${payload.maintainer}${payload.notes ? ` - ${payload.notes}` : ''}`,
            type: 'maintenance'
          };
          newEvents = [newEvent, ...state.events].slice(0, 100);
        }

        return {
          machines: state.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  maintenanceDueDays: 30 + Math.floor(Math.random() * 60), // reset to 30-90 days
                  machineHealth: 100,
                  anomalyScore: 0,
                  status: m.status === 'FAULT' ? 'IDLE' : m.status,
                  activeAlarms: 0,
                  rawTelemetry: mergeRawTelemetry(m, { state: m.status === 'FAULT' ? 'IDLE' : m.status }),
                  computedMetrics: {
                    ...m.computedMetrics,
                    healthScore: 100,
                  },
                  predictions: {
                    ...m.predictions,
                    remainingMaintenanceHours: (30 + Math.floor(Math.random() * 60)) * 24,
                    maintenanceRisk: 'low',
                  }
                }
              : m
          ),
          events: newEvents
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
             title: 'Tool Replaced',
             message: `Tool ${tool.name} replaced by ${payload.maintainer}${payload.notes ? ` - ${payload.notes}` : ''}`,
             type: 'maintenance'
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
             // Also somewhat improve machine health if it's the right machine
             if (tool && m.id === tool.machineId) {
                return {
                  ...m,
                  toolLifeRemainingPct: 100,
                  predictions: {
                    ...m.predictions,
                    remainingToolLifePct: 100,
                  },
                };
             }
             return m;
          }),
          events: newEvents
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
        events: state.events.filter(e => e.machineId !== machineId || e.severity === 'info')
      })),
  };
});
