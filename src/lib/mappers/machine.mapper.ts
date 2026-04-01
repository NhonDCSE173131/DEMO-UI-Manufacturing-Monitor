import type { Machine, ConnectionStateType, DisplayStateType, OperationalStateType } from '@/types';

/**
 * Mapper cho REST API response → UI Machine model
 * Theo BE-API-DOCUMENTATION:
 * - GET /api/v1/machines/realtime-snapshots trả về MachineRealtimeSnapshotResponse[]
 * - Các field chính: machineId, machineCode, machineName, connectionState, operationalState, displayState, ...
 */

const asNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
};

const asString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
};

const normalizeStatus = (value?: string): Machine['status'] => {
  switch ((value || '').toUpperCase()) {
    case 'RUN':
    case 'RUNNING':
      return 'RUN';
    case 'IDLE':
    case 'WAITING':
    case 'WARMUP':
      return 'IDLE';
    case 'STOP':
    case 'STOPPED':
      return 'STOP';
    case 'FAULT':
    case 'ALARM':
    case 'ERROR':
    case 'EMERGENCY_STOP':
      return 'FAULT';
    case 'MAINT':
    case 'MAINTENANCE':
      return 'MAINT';
    default:
      return 'IDLE';
  }
};

const normalizeMode = (value?: string): Machine['mode'] => {
  switch ((value || '').toUpperCase()) {
    case 'AUTO':
    case 'AUTOMATIC':
      return 'AUTO';
    case 'MANUAL':
      return 'MANUAL';
    case 'SETUP':
    case 'MDI':
    case 'JOG':
    case 'REFERENCE':
      return 'SETUP';
    default:
      return 'AUTO';
  }
};

const normalizeConnectionState = (value?: string): ConnectionStateType | undefined => {
  switch ((value || '').toUpperCase()) {
    case 'ONLINE': return 'ONLINE';
    case 'STALE':
    case 'DEGRADED': return 'STALE';
    case 'OFFLINE': return 'OFFLINE';
    case 'UNSTABLE': return 'UNSTABLE';
    default: return undefined;
  }
};

const normalizeOperationalState = (value?: string): OperationalStateType | undefined => {
  switch ((value || '').toUpperCase()) {
    case 'RUNNING': return 'RUNNING';
    case 'IDLE':
    case 'WAITING': return 'IDLE';
    case 'WARMUP': return 'WARMUP';
    case 'STOPPED': return 'STOPPED';
    case 'EMERGENCY_STOP': return 'EMERGENCY_STOP';
    case 'MAINTENANCE': return 'MAINTENANCE';
    default: return undefined;
  }
};

const normalizeDisplayState = (value?: string): DisplayStateType | undefined => {
  if (!value) return undefined;
  const op = normalizeOperationalState(value);
  if (op) return op;
  const conn = normalizeConnectionState(value);
  if (conn) return conn;
  return undefined;
};

/**
 * Map BE API response (MachineRealtimeSnapshotResponse) → UI Machine model
 * Input: từ /api/v1/machines hoặc /api/v1/machines/realtime-snapshots
 */
export const mapApiMachineToUi = (input: Partial<Machine> & Record<string, unknown>): Machine => {
  // ID fields - BE gửi machineId, machineCode
  const id = String(asString(input.machineId, input.id, input.code, input.machineCode) || `M-${Date.now()}`);
  const code = asString(input.machineCode, input.code, input.name, input.machineName, id) || id;
  const name = asString(input.machineName, input.name, input.displayName, code) || code;

  // Status from operationalState (BE uses operationalState, UI uses status)
  const operationalStateStr = asString(input.operationalState, input.displayState);
  const status = normalizeStatus(operationalStateStr);
  const mode = normalizeMode(asString(input.operationMode, input.mode));

  // Connection state fields
  const connectionState = normalizeConnectionState(asString(input.connectionState));
  const operationalState = normalizeOperationalState(asString(input.operationalState));
  const displayState = normalizeDisplayState(asString(input.displayState)) || connectionState || operationalState;
  const connectionReason = asString(input.connectionReason) ?? null;
  const connectionScope = asString(input.connectionScope) as Machine['connectionScope'] ?? null;
  const lastSeenAt = asString(input.lastSeenAt);
  const dataFreshnessSec = asNumber(input.dataFreshnessSec);
  const connectionUnstable = typeof input.connectionUnstable === 'boolean' ? input.connectionUnstable : undefined;
  
  // liveDataAvailable: BE gửi trực tiếp, hoặc tính từ connectionState + freshness
  const liveDataAvailable = input.liveDataAvailable === true ||
    (connectionState === 'ONLINE' && (dataFreshnessSec === undefined || dataFreshnessSec <= 5));

  // OEE fields
  const oee = asNumber(input.oee);
  const availability = asNumber(input.availability);
  const performance = asNumber(input.performance);
  const quality = asNumber(input.quality);

  // Fallback operational state from status
  const fallbackOperationalState: OperationalStateType =
    status === 'RUN' ? 'RUNNING'
      : status === 'FAULT' ? 'EMERGENCY_STOP'
      : status === 'STOP' ? 'STOPPED'
      : status === 'MAINT' ? 'MAINTENANCE'
      : 'IDLE';

  return {
    id,
    code,
    name,
    type: (input.type as Machine['type']) || 'cnc-milling',
    category: (input.category as Machine['category']) || 'cnc_machine',
    brand: asString(input.vendor, input.brand, input.manufacturer) || 'N/A',
    controller: asString(input.controller, input.controllerName, input.controllerType) || 'N/A',
    plc: asString(input.plc, input.plcName, input.plcType) || 'N/A',
    status,
    mode,
    image: asString(input.image, input.imageUrl, input.thumbnailUrl) || '/img/may.png',

    // OEE
    oee,
    availability,
    performance,
    quality,

    // Telemetry - BE field names
    powerKw: asNumber(input.powerKw),
    energyTodayKwh: asNumber(input.energyKwhDay, input.energyTodayKwh, input.todayEnergyKwh),
    energyMonthKwh: asNumber(input.energyMonthKwh, input.monthEnergyKwh),
    cycleTimeSec: asNumber(input.cycleTimeSec),
    idealCycleTimeSec: asNumber(input.idealCycleTimeSec),

    // Production counters - BE dùng outputCount, goodCount, rejectCount
    partCount: asNumber(input.outputCount, input.partCount, input.totalParts),
    goodCount: asNumber(input.goodCount, input.goodParts),
    ngCount: asNumber(input.rejectCount, input.ngCount, input.rejectParts),

    // Health & Maintenance
    machineHealth: asNumber(input.machineHealth, input.healthScore),
    maintenanceDueDays: asNumber(input.maintenanceDueDays),
    anomalyScore: asNumber(input.anomalyScore),
    activeAlarms: asNumber(input.activeAlarms, input.alarmCount),
    toolLifeRemainingPct: asNumber(input.remainingToolLifePct, input.toolLifeRemainingPct),

    // Machining parameters
    spindleSpeedRpm: asNumber(input.spindleSpeedRpm),
    feedRateMmMin: asNumber(input.feedRateMmMin),
    cuttingSpeedMMin: asNumber(input.cuttingSpeedMMin),
    depthOfCutMm: asNumber(input.depthOfCutMm),
    feedPerToothMm: asNumber(input.feedPerToothMm),
    widthOfCutMm: asNumber(input.widthOfCutMm),
    materialRemovalRateCm3Min: asNumber(input.materialRemovalRateCm3Min),
    spindleLoadPct: asNumber(input.spindleLoadPct),
    vibrationPct: asNumber(input.vibrationMmS, input.vibrationPct), // BE gửi vibrationMmS
    temperatureC: asNumber(input.temperatureC),
    weldingCurrentA: asNumber(input.weldingCurrentA),
    servoLoadPct: asNumber(input.servoLoadPct),

    // Program
    currentProgram: asString(input.programName, input.currentProgram) || 'N/A',

    // Area - BE gửi lineId
    area: asString(input.lineId, input.area, input.areaName, input.lineName) || 'Xưởng chính',

    // Raw telemetry object
    rawTelemetry:
      (input.rawTelemetry as Machine['rawTelemetry']) || {
        operationalState: operationalState || fallbackOperationalState,
        mode,
        powerKw: asNumber(input.powerKw),
        temperatureC: asNumber(input.temperatureC),
        vibrationMmS: asNumber(input.vibrationMmS),
        vibrationPct: asNumber(input.vibrationMmS),
        spindleRpm: asNumber(input.spindleSpeedRpm),
        feedRateMmMin: asNumber(input.feedRateMmMin),
        spindleLoadPct: asNumber(input.spindleLoadPct),
        servoLoadPct: asNumber(input.servoLoadPct),
        cycleTimeSec: asNumber(input.cycleTimeSec),
        programName: asString(input.programName),
      },

    computedMetrics: input.computedMetrics as Machine['computedMetrics'],
    predictions: input.predictions as Machine['predictions'],

    // Connection / system state fields
    connectionState,
    operationalState,
    displayState,
    connectionReason,
    connectionScope,
    lastSeenAt,
    dataFreshnessSec,
    connectionUnstable,
    liveDataAvailable,
  };
};
