// Machine Configuration Types for Management

export type MachineProtocol = 'modbus-tcp' | 'opc-ua' | 'simulator';

export interface MachineConfigForm {
  machineCode: string;
  machineName: string;
  description?: string;
  protocol: MachineProtocol | '';
  host: string;
  port: number | '';
  unitId?: number | '';
  profileCode: string;
  pollIntervalMs: number | '';
  enabled: boolean;
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
  profileCode: string;
  pollIntervalMs: number;
  enabled: boolean;
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
  profileCode: string;
  pollIntervalMs: number;
  enabled: boolean;
  autoConnect: boolean;
  createdAt: string;
  updatedAt: string;
  connectionStatus?: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastConnectionAttempt?: string;
}

export interface MachineProfileResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  fields: ProfileFieldMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileFieldMapping {
  fieldCode: string;
  fieldName: string;
  dataType: string;
  register?: number;
  byteOrder?: string;
  scaling?: number;
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
  'opc-ua': 4840,
  'simulator': 9999,
};

export const VALID_PROTOCOLS: MachineProtocol[] = ['modbus-tcp', 'opc-ua', 'simulator'];

