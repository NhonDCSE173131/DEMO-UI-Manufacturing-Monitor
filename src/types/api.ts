export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string | null;
  timestamp?: string;
  traceId?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TelemetryPointResponse {
  timestamp?: string;
  ts?: string;
  bucketEnd?: string;
  powerKw?: number;
  temperatureC?: number;
  vibrationMmS?: number;
  vibrationPct?: number;
  spindleSpeedRpm?: number;
  spindleRpm?: number;
  feedRateMmMin?: number;
  spindleLoadPct?: number;
  servoLoadPct?: number;
  cycleTimeSec?: number;
  idealCycleTimeSec?: number;
  cuttingSpeedMMin?: number;
  depthOfCutMm?: number;
  feedPerToothMm?: number;
  widthOfCutMm?: number;
  materialRemovalRateCm3Min?: number;
  weldingCurrentA?: number;
  outputCount?: number;
  partCount?: number;
  goodCount?: number;
  rejectCount?: number;
  ngCount?: number;
  machineState?: string;
  connectionStatus?: string;
  gapDetected?: boolean;
  missing?: boolean;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  [key: string]: unknown;
}

export interface TelemetrySeriesResponse {
  points: TelemetryPointResponse[];
  interval?: string;
  aggregation?: string;
  requestedMetrics?: string[];
}

export interface AnalyticsSeriesPointResponse {
  label?: string;
  timestamp?: string;
  ts?: string;
  bucketEnd?: string;
  value?: number;
  unit?: string;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  powerKw?: number;
  energyKwh?: number;
  totalPowerKw?: number;
  totalEnergyKwh?: number;
  sampleCount?: number;
  missing?: boolean;
  metrics?: Record<string, unknown>;
  cost?: number;
  [key: string]: unknown;
}

export interface AnalyticsBreakdownItemResponse {
  id?: string;
  key?: string;
  label?: string;
  name?: string;
  machineId?: string;
  machineCode?: string;
  machineName?: string;
  area?: string;
  value?: number;
  total?: number;
  percentage?: number;
  unit?: string;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  lossMinutes?: number;
  lossPercent?: number;
  [key: string]: unknown;
}

export interface EnergyOverviewResponse {
  currentPowerKw?: number;
  plantPowerKw?: number;
  peakPowerKw?: number;
  averagePowerKw?: number;
  todayEnergyKwh?: number;
  monthEnergyKwh?: number;
  todayCost?: number;
  monthCost?: number;
  costPerKwh?: number;
  voltageV?: number;
  currentA?: number;
  frequencyHz?: number;
  powerFactor?: number;
  byArea?: AnalyticsBreakdownItemResponse[];
  byMachine?: AnalyticsBreakdownItemResponse[];
  trend?: AnalyticsSeriesPointResponse[];
  costTrend?: AnalyticsSeriesPointResponse[];
  [key: string]: unknown;
}

export interface OeeOverviewResponse {
  oee?: number;
  avgOee?: number;
  availability?: number;
  avgAvailability?: number;
  performance?: number;
  avgPerformance?: number;
  quality?: number;
  avgQuality?: number;
  totalOutput?: number;
  goodOutput?: number;
  rejectOutput?: number;
  targetOutput?: number;
  workOrder?: string;
  shiftName?: string;
  byMachine?: AnalyticsBreakdownItemResponse[];
  trend?: AnalyticsSeriesPointResponse[];
  losses?: AnalyticsBreakdownItemResponse[];
  [key: string]: unknown;
}

export interface MaintenanceOverviewResponse {
  summary?: Record<string, unknown>;
  tasks?: Array<Record<string, unknown>>;
  nextService?: Array<Record<string, unknown>>;
  machines?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ToolsOverviewResponse {
  summary?: Record<string, unknown>;
  tools?: Array<Record<string, unknown>>;
  machines?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ExportJobResponse {
  jobId?: string;
  id?: string;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  fileName?: string;
  downloadUrl?: string;
  createdAt?: string;
  completedAt?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

export interface ExportTelemetryRequest {
  machineId: string;
  from: string;
  to: string;
  metrics?: string[];
  interval?: MachineHistoryQuery['interval'];
  aggregation?: MachineHistoryQuery['aggregation'];
  format?: 'csv' | string;
  timezone?: string;
}

export interface DowntimeHistoryPointResponse {
  id?: string;
  machineId?: string;
  reasonCode?: string;
  reasonGroup?: string;
  startedAt?: string;
  endedAt?: string;
  durationMin?: number;
  plannedStop?: boolean;
  abnormalStop?: boolean;
  notes?: string;
  severity?: string;
  [key: string]: unknown;
}

export interface AcknowledgeAlarmRequest {
  acknowledgedBy: string;
}

export interface SseEventEnvelope<T = unknown> {
  eventId?: string;
  eventType?: string;
  machineId?: string;
  machineCode?: string;
  sourceTs?: string;
  receivedAt?: string;
  sequence?: number;
  quality?: number | null;
  payload?: T;
}

export interface MachineHistoryQuery {
  from: string;
  to: string;
  interval?: 'raw' | '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '1d';
  aggregation?: 'avg' | 'min' | 'max' | 'last';
  metrics?: string[];
}
