export type MachineStatus = 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT';
export type MachineMode = 'AUTO' | 'MANUAL' | 'SETUP';
export type ConnectionStateType = 'ONLINE' | 'STALE' | 'OFFLINE' | 'UNSTABLE';
export type OperationalStateType = 'RUNNING' | 'IDLE' | 'WARMUP' | 'STOPPED' | 'EMERGENCY_STOP' | 'MAINTENANCE';
export type DisplayStateType = OperationalStateType | ConnectionStateType;
export type MachineType = 'robot-welding' | 'cnc-milling' | 'cnc-turning' | 'pick-place' | 'cutting-polishing';
export type MachineCategory = 'robot_only' | 'cnc_machine' | 'robot_cnc_cell';
export type EventType = 'info' | 'warning' | 'critical' | 'downtime' | 'maintenance';
export type EventSeverity = 'info' | 'warning' | 'critical';
export type EventPlanType = 'planned' | 'unplanned';

export interface RawTelemetry {
  operationalState?: OperationalStateType;
  mode?: MachineMode | string;
  powerKw?: number;
  temperatureC?: number;
  vibrationPct?: number;
  vibrationMmS?: number;
  spindleRpm?: number;
  feedRateMmMin?: number;
  spindleLoadPct?: number;
  servoLoadPct?: number;
  cycleTimeSec?: number;
  programName?: string;
}

export interface ComputedMetrics {
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  healthScore?: number;
  mtbf?: number;
  mttr?: number;
}

export interface PredictionMetrics {
  remainingToolLifePct?: number;
  remainingMaintenanceHours?: number;
  maintenanceRisk?: 'low' | 'medium' | 'high';
  predictedFailureWindow?: string;
  recommendation?: string;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  type: MachineType;
  category: MachineCategory;
  brand: string;
  controller: string;
  plc: string;
  status: MachineStatus;
  mode: MachineMode;
  image: string;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  powerKw?: number;
  energyTodayKwh?: number;
  energyMonthKwh?: number;
  cycleTimeSec?: number;
  idealCycleTimeSec?: number;
  partCount?: number;
  goodCount?: number;
  ngCount?: number;
  machineHealth?: number;
  maintenanceDueDays?: number;
  anomalyScore?: number;
  activeAlarms?: number;
  toolLifeRemainingPct?: number;
  spindleSpeedRpm?: number;
  feedRateMmMin?: number;
  cuttingSpeedMMin?: number;
  depthOfCutMm?: number;
  feedPerToothMm?: number;
  widthOfCutMm?: number;
  materialRemovalRateCm3Min?: number;
  spindleLoadPct?: number;
  vibrationMmS?: number;
  vibrationPct?: number;
  temperatureC?: number;
  weldingCurrentA?: number;
  servoLoadPct?: number;
  currentProgram: string;
  area: string;
  rawTelemetry?: RawTelemetry;
  computedMetrics?: ComputedMetrics;
  predictions?: PredictionMetrics;
  // Connection / system state fields
  connectionState?: ConnectionStateType;
  connectionUnstable?: boolean;
  lastSeenAt?: string;
  dataFreshnessSec?: number;
  operationalState?: OperationalStateType;
  displayState?: DisplayStateType;
  connectionReason?: string | null;
  connectionScope?: 'PLC' | 'COLLECTOR' | 'BE_WATCHDOG' | null;
  liveDataAvailable?: boolean;
}

export interface MachineEvent {
  id: string;
  machineId: string;
  timestamp: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  title_vi?: string;
  message: string;
  message_vi?: string;
  durationMin?: number;
  startTime?: string;
  endTime?: string;
  cause?: string;
  cause_vi?: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  plannedType?: EventPlanType;
  stopReasonCode?: string;
}

export interface Tool {
  id: string;
  machineId: string;
  name: string;
  type: string;
  remainingLifePct: number;
  estimatedPartsRemaining: number;
  estimatedHoursRemaining: number;
  usageTimeHours: number;
  wearTrend: number[];
  lastReplacedDate: string;
}

export interface PowerMetrics {
  timestamp: string;
  voltageV: number;
  currentA: number;
  powerKw: number;
  energyKwh: number;
  frequency: number;
  powerFactor: number;
  thd: number;
}

export interface SystemMetrics {
  timestamp: string;
  totalPowerKw: number;
  totalEnergyKwh: number;
  oeAverage: number;
  totalProduction: number;
  goodParts: number;
  ngParts: number;
  runningMachines: number;
  faultMachines: number;
  activeAlarms: number;
  downtimeRiskScore: number;
}
