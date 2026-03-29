import type { Machine, ConnectionStateType, OperationalStateType } from '@/types';

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

// Map a partial backend payload to the current UI Machine model with safe defaults.
export const mapApiMachineToUi = (input: Partial<Machine> & Record<string, unknown>): Machine => {
  const id = String(asString(input.id, input.machineId, input.code, input.machineCode) || `M-${Date.now()}`);
  const code = asString(input.code, input.machineCode, input.name, input.machineName, id) || id;
  const name = asString(input.name, input.machineName, input.displayName, code) || code;
  const status = normalizeStatus(asString(input.status, input.machineState, input.operationalState));
  const mode = normalizeMode(asString(input.mode, input.operationMode));

  // Connection state fields
  const connectionState = normalizeConnectionState(asString(input.connectionState, input.connection_status));
  const operationalState = normalizeOperationalState(asString(input.operationalState, input.operational_state));
  const displayState = asString(input.displayState, input.display_state);
  const connectionReason = asString(input.connectionReason, input.connection_reason) ?? null;
  const connectionScope = asString(input.connectionScope, input.connection_scope) as Machine['connectionScope'] ?? null;
  const lastSeenAt = asString(input.lastSeenAt, input.lastSeen, input.last_seen_at);
  const dataFreshnessSec = asNumber(input.dataFreshnessSec, input.data_freshness_sec, input.freshness);
  const connectionUnstable = typeof input.connectionUnstable === 'boolean' ? input.connectionUnstable : undefined;
  const liveDataAvailable = connectionState === 'ONLINE';

  // Analytics fields: không ép về 0 nếu thiếu, giữ undefined để UI hiện '--'
  const oee = asNumber(input.oee, input.todayOee);
  const availability = asNumber(input.availability, input.availabilityPct);
  const performance = asNumber(input.performance, input.performancePct);
  const quality = asNumber(input.quality, input.qualityPct);

  return {
    id,
    code,
    name,
    type: (input.type as Machine['type']) || 'cnc-milling',
    category: (input.category as Machine['category']) || 'cnc_machine',
    brand: asString(input.brand, input.vendor, input.manufacturer) || 'N/A',
    controller: asString(input.controller, input.controllerName, input.controllerType) || 'N/A',
    plc: asString(input.plc, input.plcName, input.plcType) || 'N/A',
    status,
    mode,
    image: asString(input.image, input.imageUrl, input.thumbnailUrl) || '/img/may.png',
    // Giữ default 0 để type-safe, nhưng UI sẽ check với store helpers để biết có dữ liệu thật hay không
    oee: oee ?? 0,
    availability: availability ?? 0,
    performance: performance ?? 0,
    quality: quality ?? 0,
    powerKw: asNumber(input.powerKw, input.currentPowerKw, input.plantPowerKw) ?? 0,
    energyTodayKwh: asNumber(input.energyTodayKwh, input.todayEnergyKwh) ?? 0,
    energyMonthKwh: asNumber(input.energyMonthKwh, input.monthEnergyKwh) ?? 0,
    cycleTimeSec: asNumber(input.cycleTimeSec, input.actualCycleTimeSec) ?? 0,
    idealCycleTimeSec: asNumber(input.idealCycleTimeSec) ?? 0,
    partCount: asNumber(input.partCount, input.totalParts, input.outputCount) ?? 0,
    goodCount: asNumber(input.goodCount, input.goodParts) ?? 0,
    ngCount: asNumber(input.ngCount, input.rejectCount, input.rejectParts, input.badParts) ?? 0,
    machineHealth: asNumber(input.machineHealth, input.healthScore, input.maintenanceHealthScore) ?? 0,
    maintenanceDueDays: asNumber(input.maintenanceDueDays, input.daysToMaintenance) ?? 0,
    anomalyScore: asNumber(input.anomalyScore, input.abnormalScore) ?? 0,
    activeAlarms: asNumber(input.activeAlarms, input.alarmCount, input.activeAlarmCount) ?? 0,
    toolLifeRemainingPct: asNumber(input.toolLifeRemainingPct, input.remainingToolLifePct),
    spindleSpeedRpm: asNumber(input.spindleSpeedRpm, input.spindleRpm),
    feedRateMmMin: asNumber(input.feedRateMmMin),
    cuttingSpeedMMin: asNumber(input.cuttingSpeedMMin),
    depthOfCutMm: asNumber(input.depthOfCutMm),
    feedPerToothMm: asNumber(input.feedPerToothMm),
    widthOfCutMm: asNumber(input.widthOfCutMm),
    materialRemovalRateCm3Min: asNumber(input.materialRemovalRateCm3Min),
    spindleLoadPct: asNumber(input.spindleLoadPct),
    vibrationPct: asNumber(input.vibrationMmS, input.vibrationPct),
    temperatureC: asNumber(input.temperatureC),
    weldingCurrentA: asNumber(input.weldingCurrentA),
    servoLoadPct: asNumber(input.servoLoadPct),
    currentProgram: asString(input.currentProgram, input.programName) || 'N/A',
    area: asString(input.area, input.areaName, input.lineName) || 'Xưởng chính',
    rawTelemetry:
      (input.rawTelemetry as Machine['rawTelemetry']) || {
        state: status,
        mode,
        powerKw: asNumber(input.powerKw, input.currentPowerKw),
        temperatureC: asNumber(input.temperatureC),
        vibrationPct: asNumber(input.vibrationMmS, input.vibrationPct),
        spindleRpm: asNumber(input.spindleSpeedRpm, input.spindleRpm),
        feedRateMmMin: asNumber(input.feedRateMmMin),
        servoLoadPct: asNumber(input.servoLoadPct),
        programName: asString(input.currentProgram, input.programName),
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

