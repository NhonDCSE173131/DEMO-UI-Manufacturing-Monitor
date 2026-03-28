import type { Machine } from '@/types';

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const toString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

const toStatus = (value: unknown): Machine['status'] | undefined => {
  const raw = toString(value)?.toUpperCase();
  if (!raw) return undefined;
  if (raw === 'RUN' || raw === 'RUNNING') return 'RUN';
  if (raw === 'IDLE' || raw === 'WAITING') return 'IDLE';
  if (raw === 'STOP' || raw === 'STOPPED') return 'STOP';
  if (raw === 'FAULT' || raw === 'ERROR' || raw === 'ALARM') return 'FAULT';
  if (raw === 'MAINT' || raw === 'MAINTENANCE') return 'MAINT';
  return undefined;
};

const toMode = (value: unknown): Machine['mode'] | undefined => {
  const raw = toString(value)?.toUpperCase();
  if (!raw) return undefined;
  if (raw === 'AUTO' || raw === 'AUTOMATIC') return 'AUTO';
  if (raw === 'MANUAL') return 'MANUAL';
  if (raw === 'SETUP') return 'SETUP';
  return undefined;
};

export const mapRealtimeTelemetryPatch = (payload: Record<string, unknown>): Partial<Machine> => {
  const status = toStatus(payload.status ?? payload.machineStatus ?? payload.operationState);
  const mode = toMode(payload.mode ?? payload.operationMode);
  const rawTelemetry = status && mode
    ? {
        state: status,
        mode,
        powerKw: toNumber(payload.powerKw ?? payload.currentPowerKw),
        temperatureC: toNumber(payload.temperatureC),
        // vibrationMmS là field chính từ BE snapshot
        vibrationPct: toNumber(payload.vibrationMmS ?? payload.vibrationPct),
        spindleRpm: toNumber(payload.spindleRpm ?? payload.spindleSpeedRpm),
        feedRateMmMin: toNumber(payload.feedRateMmMin),
        servoLoadPct: toNumber(payload.servoLoadPct),
        programName: toString(payload.programName ?? payload.currentProgram),
      }
    : undefined;

  return {
    status,
    mode,
    powerKw: toNumber(payload.powerKw ?? payload.currentPowerKw),
    oee: toNumber(payload.oee),
    availability: toNumber(payload.availability),
    performance: toNumber(payload.performance),
    quality: toNumber(payload.quality),
    machineHealth: toNumber(payload.machineHealth ?? payload.healthScore),
    activeAlarms: toNumber(payload.activeAlarms ?? payload.alarmCount ?? payload.activeAlarmCount),
    temperatureC: toNumber(payload.temperatureC),
    // vibrationMmS là field chính; vibrationPct là alias cũ
    vibrationPct: toNumber(payload.vibrationMmS ?? payload.vibrationPct),
    spindleSpeedRpm: toNumber(payload.spindleRpm ?? payload.spindleSpeedRpm),
    feedRateMmMin: toNumber(payload.feedRateMmMin),
    servoLoadPct: toNumber(payload.servoLoadPct),
    currentProgram: toString(payload.programName ?? payload.currentProgram),
    // rejectCount là field chính từ BE; ngCount là alias cũ
    ngCount: toNumber(payload.rejectCount ?? payload.ngCount),
    // outputCount là field chính từ BE; partCount là alias cũ
    partCount: toNumber(payload.outputCount ?? payload.partCount),
    goodCount: toNumber(payload.goodCount),
    rawTelemetry,
  };
};

export const pruneUndefinedPatch = <T extends Record<string, unknown>>(patch: T): Partial<T> => {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;
};

