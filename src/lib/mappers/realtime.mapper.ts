import type { Machine, ConnectionStateType, DisplayStateType, OperationalStateType } from '@/types';

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
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
  if (raw === 'IDLE' || raw === 'WAITING' || raw === 'WARMUP') return 'IDLE';
  if (raw === 'STOP' || raw === 'STOPPED') return 'STOP';
  if (raw === 'FAULT' || raw === 'ERROR' || raw === 'ALARM' || raw === 'EMERGENCY_STOP') return 'FAULT';
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

const toConnectionState = (value: unknown): ConnectionStateType | undefined => {
  const raw = toString(value)?.toUpperCase();
  if (!raw) return undefined;
  if (raw === 'ONLINE') return 'ONLINE';
  if (raw === 'STALE' || raw === 'DEGRADED') return 'STALE';
  if (raw === 'OFFLINE') return 'OFFLINE';
  if (raw === 'UNSTABLE') return 'UNSTABLE';
  return undefined;
};

const toOperationalState = (value: unknown): OperationalStateType | undefined => {
  const raw = toString(value)?.toUpperCase();
  if (!raw) return undefined;
  if (raw === 'RUNNING') return 'RUNNING';
  if (raw === 'IDLE' || raw === 'WAITING') return 'IDLE';
  if (raw === 'WARMUP') return 'WARMUP';
  if (raw === 'STOPPED') return 'STOPPED';
  if (raw === 'EMERGENCY_STOP') return 'EMERGENCY_STOP';
  if (raw === 'MAINTENANCE') return 'MAINTENANCE';
  return undefined;
};

const toDisplayState = (value: unknown): DisplayStateType | undefined => {
  const op = toOperationalState(value);
  if (op) return op;
  const conn = toConnectionState(value);
  if (conn) return conn;
  return undefined;
};

export const mapRealtimeTelemetryPatch = (payload: Record<string, unknown>): Partial<Machine> => {
  const status = toStatus(payload.status ?? payload.machineStatus ?? payload.operationState ?? payload.operationalState);
  const mode = toMode(payload.mode ?? payload.operationMode);
  const connectionUnstable = payload.connectionUnstable === true;
  const connectionState = toConnectionState(payload.connectionState ?? payload.connection_status ?? payload.connection ?? payload.to ?? payload.state);
  const operationalState = toOperationalState(payload.operationalState ?? payload.operational_state);
  const displayState = toDisplayState(payload.displayState ?? payload.display_state) || (connectionUnstable ? 'UNSTABLE' : connectionState) || operationalState;

  const rawTelemetry = status || mode || operationalState
    ? {
        operationalState,
        mode,
        powerKw: toNumber(payload.powerKw ?? payload.currentPowerKw),
        temperatureC: toNumber(payload.temperatureC),
        vibrationMmS: toNumber(payload.vibrationMmS ?? payload.vibrationPct),
        vibrationPct: toNumber(payload.vibrationPct ?? payload.vibrationMmS),
        spindleRpm: toNumber(payload.spindleRpm ?? payload.spindleSpeedRpm),
        feedRateMmMin: toNumber(payload.feedRateMmMin),
        spindleLoadPct: toNumber(payload.spindleLoadPct),
        servoLoadPct: toNumber(payload.servoLoadPct),
        cycleTimeSec: toNumber(payload.cycleTimeSec),
        programName: toString(payload.programName ?? payload.currentProgram),
      }
    : undefined;

  const lastSeenAt = toString(payload.lastSeenAt ?? payload.lastSeen ?? payload.last_seen_at);
  const dataFreshnessSec = toNumber(payload.dataFreshnessSec ?? payload.data_freshness_sec ?? payload.freshness ?? payload.freshnessSec);
  const effectiveConnectionState = connectionUnstable ? 'UNSTABLE' : connectionState;
  const liveDataAvailable =
    (effectiveConnectionState === 'ONLINE' || effectiveConnectionState === 'UNSTABLE')
    && (dataFreshnessSec === undefined || dataFreshnessSec <= 30);

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
    vibrationPct: toNumber(payload.vibrationPct ?? payload.vibrationMmS),
    spindleSpeedRpm: toNumber(payload.spindleRpm ?? payload.spindleSpeedRpm),
    feedRateMmMin: toNumber(payload.feedRateMmMin),
    servoLoadPct: toNumber(payload.servoLoadPct),
    currentProgram: toString(payload.programName ?? payload.currentProgram),
    ngCount: toNumber(payload.rejectCount ?? payload.ngCount),
    partCount: toNumber(payload.outputCount ?? payload.partCount),
    goodCount: toNumber(payload.goodCount),
    rawTelemetry,
    // Connection / system state fields
    connectionState: effectiveConnectionState,
    connectionUnstable,
    operationalState,
    displayState,
    connectionReason: toString(payload.connectionReason ?? payload.connection_reason) ?? null,
    connectionScope: toString(payload.connectionScope ?? payload.connection_scope) as Machine['connectionScope'] ?? null,
    lastSeenAt,
    dataFreshnessSec,
    liveDataAvailable,
  };
};

export const pruneUndefinedPatch = <T extends Record<string, unknown>>(patch: T): Partial<T> => {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;
};

