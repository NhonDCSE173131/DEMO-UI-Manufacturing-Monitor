import type { Machine, ConnectionStateType, DisplayStateType, OperationalStateType } from '@/types';

/**
 * Mapper cho SSE snapshot.updated payload → UI Machine model
 * Theo BE-API-DOCUMENTATION, payload có các field:
 * - machineId, machineCode, machineName, ts
 * - connectionState, connectionUnstable, lastSeenAt, dataFreshnessSec, liveDataAvailable
 * - operationalState, displayState, operationMode, programName, cycleRunning
 * - powerKw, temperatureC, vibrationMmS, runtimeHours, cycleTimeSec, idealCycleTimeSec
 * - outputCount, goodCount, rejectCount
 * - spindleSpeedRpm, feedRateMmMin, spindleLoadPct, servoLoadPct
 * - oee, availability, performance, quality
 * - machineHealth, anomalyScore, maintenanceDueDays, maintenanceRisk
 */

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
  if (raw === 'SETUP' || raw === 'MDI' || raw === 'JOG' || raw === 'REFERENCE') return 'SETUP';
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

/**
 * Map snapshot.updated payload → Partial<Machine>
 * Dùng cho cả SSE event và REST /machines/realtime-snapshots
 */
export const mapRealtimeTelemetryPatch = (payload: Record<string, unknown>): Partial<Machine> => {
  // Status & Mode (từ operationalState theo BE)
  const status = toStatus(payload.operationalState ?? payload.displayState ?? payload.status);
  const mode = toMode(payload.operationMode ?? payload.mode);

  // Connection state fields
  const connectionUnstable = payload.connectionUnstable === true;
  const connectionState = toConnectionState(payload.connectionState);
  const operationalState = toOperationalState(payload.operationalState);
  const displayState = toDisplayState(payload.displayState) || operationalState || (connectionUnstable ? 'UNSTABLE' : connectionState);

  // Telemetry raw (for rawTelemetry field)
  const rawTelemetry = {
    operationalState,
    mode,
    powerKw: toNumber(payload.powerKw),
    temperatureC: toNumber(payload.temperatureC),
    vibrationMmS: toNumber(payload.vibrationMmS),
    vibrationPct: toNumber(payload.vibrationMmS), // BE dùng vibrationMmS
    spindleRpm: toNumber(payload.spindleSpeedRpm),
    feedRateMmMin: toNumber(payload.feedRateMmMin),
    spindleLoadPct: toNumber(payload.spindleLoadPct),
    servoLoadPct: toNumber(payload.servoLoadPct),
    cycleTimeSec: toNumber(payload.cycleTimeSec),
    programName: toString(payload.programName),
  };

  // Connection metadata
  const lastSeenAt = toString(payload.lastSeenAt);
  const dataFreshnessSec = toNumber(payload.dataFreshnessSec);
  const effectiveConnectionState = connectionUnstable ? 'UNSTABLE' : connectionState;
  const liveDataAvailable = payload.liveDataAvailable === true ||
    ((effectiveConnectionState === 'ONLINE' || effectiveConnectionState === 'UNSTABLE')
      && (dataFreshnessSec === undefined || dataFreshnessSec <= 5));

  return {
    // Status & mode
    status,
    mode,

    // Connection state
    connectionState: effectiveConnectionState,
    connectionUnstable,
    operationalState,
    displayState,
    lastSeenAt,
    dataFreshnessSec,
    liveDataAvailable,
    connectionReason: toString(payload.connectionReason) ?? null,
    connectionScope: toString(payload.connectionScope) as Machine['connectionScope'] ?? null,

    // OEE metrics
    oee: toNumber(payload.oee),
    availability: toNumber(payload.availability),
    performance: toNumber(payload.performance),
    quality: toNumber(payload.quality),

    // Telemetry metrics
    powerKw: toNumber(payload.powerKw),
    temperatureC: toNumber(payload.temperatureC),
    vibrationPct: toNumber(payload.vibrationMmS), // BE gửi vibrationMmS
    spindleSpeedRpm: toNumber(payload.spindleSpeedRpm),
    feedRateMmMin: toNumber(payload.feedRateMmMin),
    spindleLoadPct: toNumber(payload.spindleLoadPct),
    servoLoadPct: toNumber(payload.servoLoadPct),
    cycleTimeSec: toNumber(payload.cycleTimeSec),
    idealCycleTimeSec: toNumber(payload.idealCycleTimeSec),

    // Machining parameters
    cuttingSpeedMMin: toNumber(payload.cuttingSpeedMMin),
    depthOfCutMm: toNumber(payload.depthOfCutMm),
    feedPerToothMm: toNumber(payload.feedPerToothMm),
    widthOfCutMm: toNumber(payload.widthOfCutMm),
    materialRemovalRateCm3Min: toNumber(payload.materialRemovalRateCm3Min),
    weldingCurrentA: toNumber(payload.weldingCurrentA),

    // Production counters - BE dùng outputCount, goodCount, rejectCount
    partCount: toNumber(payload.outputCount),
    goodCount: toNumber(payload.goodCount),
    ngCount: toNumber(payload.rejectCount),

    // Program
    currentProgram: toString(payload.programName) || 'N/A',

    // Health & Maintenance
    machineHealth: toNumber(payload.machineHealth),
    anomalyScore: toNumber(payload.anomalyScore),
    maintenanceDueDays: toNumber(payload.maintenanceDueDays),
    toolLifeRemainingPct: toNumber(payload.remainingToolLifePct),

    // Energy
    energyTodayKwh: toNumber(payload.energyKwhDay),

    // Raw telemetry object
    rawTelemetry,
  };
};

export const pruneUndefinedPatch = <T extends Record<string, unknown>>(patch: T): Partial<T> => {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;
};
