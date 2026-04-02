import type { MachineConfigForm, CreateMachinePayload, ValidationResult, ValidationError, MachineProtocol } from '@/types/machine-config';
import { DEFAULT_PROTOCOL_PORTS, VALID_PROTOCOLS } from '@/types/machine-config';

const MACHINE_CODE_REGEX = /^[A-Z0-9_-]+$/;
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PORT_MIN = 1;
const PORT_MAX = 65535;
const POLL_INTERVAL_MIN = 200;
const POLL_INTERVAL_MAX = 60000;

type ValidationMessageOverrides = Partial<{
  machineCodeRequired: string;
  machineCodeInvalid: string;
  machineCodeFormatInvalid: string;
  machineNameRequired: string;
  protocolRequired: string;
  protocolInvalid: string;
  hostRequired: string;
  hostInvalid: string;
  portInvalid: string;
  portRange: string;
  pollIntervalRange: string;
  profileRequired: string;
}>;

const replaceToken = (template: string, key: string, value: string | number): string => template.replace(`{{${key}}}`, String(value));

export function normalizeMachineConfigInput(input: MachineConfigForm): CreateMachinePayload {
  // Normalize machineCode: uppercase, trim, replace spaces with underscore
  let machineCode = input.machineCode.trim().toUpperCase();
  machineCode = machineCode.replace(/\s+/g, '_');

  // Normalize machineName: trim, collapse multiple spaces
  const machineName = input.machineName.trim().replace(/\s+/g, ' ');

  // Normalize description
  const description = input.description?.trim() || undefined;

  // Normalize protocol - already validated at form level
  const protocol = input.protocol as MachineProtocol;

  // Normalize host: trim, lowercase
  const host = input.host.trim().toLowerCase();

  // Port - ép về number
  let port = typeof input.port === 'number' ? input.port : parseInt(String(input.port), 10);
  if (!Number.isInteger(port) || port < PORT_MIN || port > PORT_MAX) {
    port = DEFAULT_PROTOCOL_PORTS[protocol];
  }

  // Normalize unitId
  let unitId: number | undefined;
  if (input.unitId !== undefined && input.unitId !== null && input.unitId !== '') {
    unitId = Number(input.unitId);
    if (!Number.isInteger(unitId) || unitId < 0) {
      unitId = 1;
    }
  }

  // Normalize profileCode: uppercase, trim
  const profileCode = input.profileCode.trim().toUpperCase();

  // Poll interval - ép về number
  let pollIntervalMs = typeof input.pollIntervalMs === 'number' ? input.pollIntervalMs : parseInt(String(input.pollIntervalMs), 10);
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < POLL_INTERVAL_MIN || pollIntervalMs > POLL_INTERVAL_MAX) {
    pollIntervalMs = 1000;
  }

  return {
    machineCode,
    machineName,
    description,
    protocol,
    host,
    port,
    unitId,
    profileCode,
    pollIntervalMs,
    enabled: input.enabled,
    autoConnect: input.autoConnect,
  };
}

export function validateMachineConfig(input: MachineConfigForm, messages: ValidationMessageOverrides = {}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate machineCode
  if (!input.machineCode || input.machineCode.trim() === '') {
    errors.push({
      field: 'machineCode',
      message: messages.machineCodeRequired || 'Mã máy không được trống',
    });
  } else {
    const normalizedCode = input.machineCode.trim().toUpperCase().replace(/\s+/g, '_');
    if (!MACHINE_CODE_REGEX.test(normalizedCode)) {
      errors.push({
        field: 'machineCode',
        message: messages.machineCodeInvalid || 'Mã máy chỉ chứa chữ cái, số, dấu gạch dưới và dấu gạch ngang',
      });
    }
  }

  // Validate machineName
  if (!input.machineName || input.machineName.trim() === '') {
    errors.push({
      field: 'machineName',
      message: messages.machineNameRequired || 'Tên máy không được trống',
    });
  }

  // Validate protocol
  if (!input.protocol || (input.protocol as string) === '' || (input.protocol as string).trim() === '') {
    errors.push({
      field: 'protocol',
      message: messages.protocolRequired || 'Protocol không được trống',
    });
  } else if (!VALID_PROTOCOLS.includes(input.protocol as any)) {
    errors.push({
      field: 'protocol',
      message: messages.protocolInvalid || 'Protocol không hợp lệ',
    });
  }

  // Validate host
  if (!input.host || input.host.trim() === '') {
    errors.push({
      field: 'host',
      message: messages.hostRequired || 'Host/IP không được trống',
    });
  } else {
    const hostLower = input.host.trim().toLowerCase();
    if (!IP_REGEX.test(hostLower)) {
      errors.push({
        field: 'host',
        message: messages.hostInvalid || 'Host/IP không hợp lệ',
      });
    }
  }

  // Validate port
  if (input.port !== '' && input.port !== null) {
    const portNum = Number(input.port);
    if (!Number.isInteger(portNum) || portNum < PORT_MIN || portNum > PORT_MAX) {
      errors.push({
        field: 'port',
        message: messages.portRange
          ? replaceToken(replaceToken(messages.portRange, 'min', PORT_MIN), 'max', PORT_MAX)
          : `Port phải là số từ ${PORT_MIN} đến ${PORT_MAX}`,
      });
    }
  }

  // Validate pollIntervalMs
  if (input.pollIntervalMs !== '' && input.pollIntervalMs !== null) {
    const pollNum = Number(input.pollIntervalMs);
    if (!Number.isInteger(pollNum) || pollNum < POLL_INTERVAL_MIN || pollNum > POLL_INTERVAL_MAX) {
      errors.push({
        field: 'pollIntervalMs',
        message: messages.pollIntervalRange
          ? replaceToken(replaceToken(messages.pollIntervalRange, 'min', POLL_INTERVAL_MIN), 'max', POLL_INTERVAL_MAX)
          : `Poll Interval phải từ ${POLL_INTERVAL_MIN}ms đến ${POLL_INTERVAL_MAX}ms`,
      });
    }
  }

  // Validate profileCode
  if (!input.profileCode || input.profileCode.trim() === '') {
    errors.push({
      field: 'profileCode',
      message: messages.profileRequired || 'Profile không được trống',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateImportRow(
  _rowIndex: number,
  machineCode: string,
  machineName: string,
  protocol: string,
  host: string,
  port: string | number,
  profileCode: string,
  messages: ValidationMessageOverrides = {},
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!machineCode || machineCode.trim() === '') {
    errors.push({
      field: 'machineCode',
      message: messages.machineCodeRequired || 'Mã máy không được trống',
    });
  } else {
    const normalizedCode = machineCode.trim().toUpperCase().replace(/\s+/g, '_');
    if (!MACHINE_CODE_REGEX.test(normalizedCode)) {
      errors.push({
        field: 'machineCode',
        message: messages.machineCodeFormatInvalid || 'Mã máy sai định dạng',
      });
    }
  }

  if (!machineName || machineName.trim() === '') {
    errors.push({
      field: 'machineName',
      message: messages.machineNameRequired || 'Tên máy không được trống',
    });
  }

  if (!protocol || !VALID_PROTOCOLS.includes(protocol as any)) {
    errors.push({
      field: 'protocol',
      message: messages.protocolInvalid || 'Protocol không hợp lệ',
    });
  }

  if (!host || host.trim() === '') {
    errors.push({
      field: 'host',
      message: messages.hostRequired || 'Host/IP không được trống',
    });
  } else {
    const hostLower = host.trim().toLowerCase();
    if (!IP_REGEX.test(hostLower)) {
      errors.push({
        field: 'host',
        message: messages.hostInvalid || 'Host/IP không hợp lệ',
      });
    }
  }

  const portNum = typeof port === 'number' ? port : parseInt(String(port), 10);
  if (!Number.isInteger(portNum) || portNum < PORT_MIN || portNum > PORT_MAX) {
    errors.push({
      field: 'port',
      message: messages.portInvalid || 'Port không hợp lệ',
    });
  }

  if (!profileCode || profileCode.trim() === '') {
    errors.push({
      field: 'profileCode',
      message: messages.profileRequired || 'Profile không được trống',
    });
  }

  return errors;
}





