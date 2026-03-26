import type { MachineEvent } from '@/types';

const asString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
};

const asNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
};

const normalizeSeverity = (value?: string): MachineEvent['severity'] => {
  switch ((value || '').toUpperCase()) {
    case 'CRITICAL':
    case 'ERROR':
      return 'critical';
    case 'WARNING':
    case 'WARN':
      return 'warning';
    default:
      return 'info';
  }
};

export const mapApiAlarmToUi = (input: Partial<MachineEvent> & Record<string, unknown>): MachineEvent => {
  const severity = normalizeSeverity(asString(input.severity));
  const id = String(asString(input.id, input.alarmId, input.eventId) || `E-${Date.now()}`);
  const message = asString(input.message, input.description) || '';
  const cause = asString(input.cause, input.reasonCode, input.alarmType);

  return {
    id,
    machineId: String(asString(input.machineId, input.machineCode) || 'UNKNOWN'),
    timestamp: String(asString(input.timestamp, input.startedAt, input.sourceTs) || new Date().toISOString()),
    type: severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info',
    severity,
    title: String(asString(input.title, input.alarmCode, input.alarmType) || 'Canh bao'),
    title_vi: (input.title_vi as string | undefined) || undefined,
    message,
    message_vi: (input.message_vi as string | undefined) || undefined,
    durationMin: asNumber(input.durationMin, input.durationMinutes) as number | undefined,
    startTime: asString(input.startTime, input.startedAt) as string | undefined,
    endTime: asString(input.endTime, input.endedAt) as string | undefined,
    cause,
    cause_vi: input.cause_vi as string | undefined,
    acknowledged: (input.acknowledged as boolean | undefined) ?? false,
    acknowledgedBy: asString(input.acknowledgedBy) as string | undefined,
    plannedType: input.plannedType as MachineEvent['plannedType'],
    stopReasonCode: asString(input.stopReasonCode, input.reasonCode, input.alarmCode) as string | undefined,
  };
};

