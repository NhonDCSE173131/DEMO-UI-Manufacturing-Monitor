type Locale = 'en' | 'vi';

type LegacyStatus = 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT';

const humanizeToken = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const resolveMachineDisplayState = (machine: {
  displayState?: string;
  connectionState?: string;
  operationalState?: string;
  status?: string;
}): string => {
  const display = machine.displayState?.toUpperCase();
  if (display) return display;
  if (machine.connectionState && machine.connectionState !== 'ONLINE') return machine.connectionState.toUpperCase();
  if (machine.operationalState) return machine.operationalState.toUpperCase();
  const status = machine.status?.toUpperCase();
  if (status === 'RUN') return 'RUNNING';
  if (status === 'FAULT') return 'EMERGENCY_STOP';
  if (status === 'STOP') return 'STOPPED';
  if (status === 'MAINT') return 'MAINTENANCE';
  return 'IDLE';
};

export const legacyStatusFromDisplayState = (state: string): LegacyStatus => {
  if (state === 'RUNNING') return 'RUN';
  if (state === 'EMERGENCY_STOP') return 'FAULT';
  if (state === 'STOPPED') return 'STOP';
  if (state === 'MAINTENANCE') return 'MAINT';
  return 'IDLE';
};

export const formatMachineMode = (mode?: string, locale: Locale = 'vi'): string => {
  const map: Record<string, { en: string; vi: string }> = {
    AUTO: { en: 'Automatic', vi: 'Tự động' },
    MANUAL: { en: 'Manual', vi: 'Thủ công' },
    SETUP: { en: 'Setup', vi: 'Thiết lập' },
  };
  if (!mode) return locale === 'en' ? 'Unknown mode' : 'Không rõ chế độ';
  return map[mode]?.[locale] || humanizeToken(mode);
};

export const formatMachineCategory = (category?: string, locale: Locale = 'vi'): string => {
  const map: Record<string, { en: string; vi: string }> = {
    robot_only: { en: 'Standalone Robot', vi: 'Robot độc lập' },
    cnc_machine: { en: 'CNC Machine', vi: 'Máy CNC' },
    robot_cnc_cell: { en: 'Robot + CNC Cell', vi: 'Tổ hợp robot + CNC' },
  };
  if (!category) return locale === 'en' ? 'Unknown category' : 'Không rõ nhóm máy';
  return map[category]?.[locale] || humanizeToken(category);
};

export const formatMachineType = (type?: string, locale: Locale = 'vi'): string => {
  const map: Record<string, { en: string; vi: string }> = {
    'robot-welding': { en: 'Welding Robot', vi: 'Robot hàn' },
    'cnc-milling': { en: 'CNC Milling Machine', vi: 'Máy phay CNC' },
    'cnc-turning': { en: 'CNC Turning Machine', vi: 'Máy tiện CNC' },
    'pick-place': { en: 'Pick and Place Robot', vi: 'Robot gắp đặt' },
    'cutting-polishing': { en: 'Cutting and Polishing Cell', vi: 'Cell cắt và đánh bóng' },
  };
  if (!type) return locale === 'en' ? 'Unknown type' : 'Không rõ loại máy';
  return map[type]?.[locale] || humanizeToken(type);
};

export const formatAreaLabel = (area?: string, locale: Locale = 'vi'): string => {
  const map: Record<string, { en: string; vi: string }> = {
    'Assembly Line A': { en: 'Assembly Line A', vi: 'Dây chuyền lắp ráp A' },
    'Assembly Line B': { en: 'Assembly Line B', vi: 'Dây chuyền lắp ráp B' },
    'Machining Center': { en: 'Machining Center', vi: 'Trung tâm gia công' },
    'Main Workshop': { en: 'Main Workshop', vi: 'Xưởng chính' },
  };
  if (!area) return locale === 'en' ? 'Unknown area' : 'Không rõ khu vực';
  return map[area]?.[locale] || area;
};

export const formatStopReasonLabel = (reason?: string, locale: Locale = 'vi'): string => {
  const map: Record<string, { en: string; vi: string }> = {
    SENSOR_FAULT: { en: 'Sensor Fault', vi: 'Lỗi cảm biến' },
    TOOL_WEAR: { en: 'Tool Wear', vi: 'Mòn dao cụ' },
    OVERHEAT: { en: 'Overheat', vi: 'Quá nhiệt' },
    POWER_LOSS: { en: 'Power Loss', vi: 'Mất nguồn' },
    PLC_TIMEOUT: { en: 'PLC Timeout', vi: 'PLC mất phản hồi' },
    SERVO_OVERLOAD: { en: 'Servo Overload', vi: 'Quá tải servo' },
    QUALITY_HOLD: { en: 'Quality Hold', vi: 'Tạm dừng do chất lượng' },
    MATERIAL_SHORTAGE: { en: 'Material Shortage', vi: 'Thiếu vật liệu' },
    OTHER: { en: 'Other', vi: 'Khác' },
    UNKNOWN: { en: 'Unknown', vi: 'Không rõ' },
  };
  if (!reason) return locale === 'en' ? 'Unknown' : 'Không rõ';
  return map[reason]?.[locale] || humanizeToken(reason);
};

