// Machine Configuration Types for Management

export type MachineProtocol = 'modbus-tcp';

export interface MachineConfigForm {
  machineCode: string;
  machineName: string;
  description?: string;
  protocol: MachineProtocol | '';
  host: string;
  port: number | '';
  unitId?: number | '';
  profileId: string;
  mappingFileId?: string;
  pollIntervalMs: number | '';
  autoConnect: boolean;
}

export interface CreateMachinePayload {
  machineCode: string;
  machineName: string;
  description?: string;
  protocol: MachineProtocol;
  host: string;
  port: number;
  unitId?: number;
  profileId: string;
  profileCode?: string;
  mappingFileId?: string;
  pollIntervalMs: number;
  autoConnect: boolean;
}

export interface MachineConfigResponse {
  id: string;
  machineCode: string;
  machineName: string;
  description?: string;
  protocol: MachineProtocol;
  host: string;
  port: number;
  unitId?: number;
  profileId?: string;
  profileCode: string;
  mappingFileId?: string;
  pollIntervalMs: number;
  enabled: boolean;
  autoConnect: boolean;
  createdAt: string;
  updatedAt: string;
  connectionStatus?: 'ONLINE' | 'STALE' | 'OFFLINE' | 'UNSTABLE' | 'BAD_CONFIG' | 'ERROR';
  lastConnectionAttempt?: string;
}

export interface MachineProfileResponse {
  id: string;
  profileCode: string;
  profileName: string;
  protocol: string;
  vendor?: string;
  model?: string;
  description?: string;
  mappings: ProfileFieldMapping[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMachineProfilePayload {
  profileCode: string;
  profileName: string;
  protocol: MachineProtocol;
  vendor?: string;
  model?: string;
  description?: string;
}

export interface ProfileFieldMapping {
  id?: string;
  logicalKey: string;
  area: 'COIL' | 'DISCRETE_INPUT' | 'HOLDING' | 'INPUT';
  addressStart: number;
  bitIndex?: number;
  dataType: string;
  scaleFactor?: number;
  unit?: string;
  byteOrder?: string;
  wordOrder?: string;
  isRequired?: boolean;
  description?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ImportMachineRow {
  rowIndex: number;
  machineCode: string;
  machineName: string;
  protocol: MachineProtocol;
  host: string;
  port: number | string;
  profileCode: string;
  description?: string;
  isValid?: boolean;
  errors?: ValidationError[];
}

export interface ImportResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    rowIndex: number;
    machineCode: string;
    message: string;
  }>;
}

export interface ConnectionTestResult {
  machineId: string;
  isConnected: boolean;
  message: string;
  latencyMs?: number;
  error?: string;
}

export type ImportMode = 'create-only' | 'update-existing' | 'upsert';

export const DEFAULT_PROTOCOL_PORTS: Record<MachineProtocol, number> = {
  'modbus-tcp': 502,
};

export const VALID_PROTOCOLS: MachineProtocol[] = ['modbus-tcp'];

export interface ImportedMappingFile {
  fileId: string;
  fileName: string;
  importType: 'MAPPING' | 'MAPPINGS' | 'PROFILE';
  batchId: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'PENDING' | 'FAILED';
  profileCode: string;
  profileId?: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
}

export interface ValidateProfileMappingPayload {
  profileId: string;
  mappingFileId: string;
}

export interface ValidateProfileMappingResponse {
  valid: boolean;
  profileId: string;
  profileCode: string;
  mappingFileId: string;
  mappingProfileCode: string;
}
