export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatPower = (kw: number): string => {
  return `${formatNumber(kw, 1)} kW`;
};

export const formatEnergy = (kwh: number): string => {
  return `${formatNumber(kwh, 2)} kWh`;
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `${hours}:${minutes}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    RUN: 'industrial-success',
    IDLE: 'industrial-warning',
    STOP: 'industrial-warning',
    FAULT: 'industrial-error',
    MAINT: 'industrial-info',
  };
  return colors[status] || 'industrial-text-secondary';
};

export const getAlertColor = (severity: string): string => {
  const colors: Record<string, string> = {
    info: 'industrial-info',
    warning: 'industrial-warning',
    critical: 'industrial-error',
  };
  return colors[severity] || 'industrial-text-secondary';
};

export const getSeverityBgColor = (severity: string): string => {
  const colors: Record<string, string> = {
    info: 'bg-industrial-info/10',
    warning: 'bg-industrial-warning/10',
    critical: 'bg-industrial-error/10',
  };
  return colors[severity] || 'bg-transparent';
};

export const getSeverityBorderColor = (severity: string): string => {
  const colors: Record<string, string> = {
    info: 'border-industrial-info',
    warning: 'border-industrial-warning',
    critical: 'border-industrial-error',
  };
  return colors[severity] || 'border-industrial-text-secondary';
};

export const getHealthScore = (score: number, selectedLanguage: 'en' | 'vi' = 'en', messages?: any): string => {
  if (messages) {
    if (score >= 85) return selectedLanguage === 'en' ? 'Excellent' : messages.machineDetail?.excellent || 'Rất tốt';
    if (score >= 70) return selectedLanguage === 'en' ? 'Good' : messages.machineDetail?.good || 'Tốt';
    if (score >= 50) return selectedLanguage === 'en' ? 'Fair' : messages.machineDetail?.fair || 'Trung bình';
    return selectedLanguage === 'en' ? 'Poor' : messages.machineDetail?.poor || 'Kém';
  }
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
};

export const calculateDowntimePercentage = (runtime: number, totalTime: number): number => {
  return totalTime > 0 ? ((totalTime - runtime) / totalTime) * 100 : 0;
};
