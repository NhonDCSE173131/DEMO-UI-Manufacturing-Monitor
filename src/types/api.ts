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
  powerKw?: number;
  temperatureC?: number;
  vibrationPct?: number;
  spindleRpm?: number;
  feedRateMmMin?: number;
  spindleLoadPct?: number;
  servoLoadPct?: number;
  cycleTimeSec?: number;
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
}

export interface AcknowledgeAlarmRequest {
  acknowledgedBy: string;
}

export interface SseEventEnvelope<T = unknown> {
  eventId?: string;
  eventType?: string;
  machineId?: string;
  sourceTs?: string;
  receivedAt?: string;
  sequence?: number;
  quality?: string;
  payload?: T;
}

export interface MachineHistoryQuery {
  from: string;
  to: string;
  interval?: 'raw' | '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '1d';
  aggregation?: 'avg' | 'min' | 'max' | 'last';
}

