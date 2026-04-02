import type { TimeRange } from '@/components/TimeRangeSelector';

export type LocaleKey = 'en' | 'vi';

interface RangeConfig {
  totalMinutes: number;
  pointCount: number;
  energyUnit: 'kW' | 'kWh';
  downtimeUnit: 's' | 'm' | 'h';
  /** Format chuỗi mô tả cách hiển thị trục X */
  xAxisFormat: string;
}

const RANGE_CONFIG: Record<TimeRange, RangeConfig> = {
  '60s': { totalMinutes: 1, pointCount: 12, energyUnit: 'kW', downtimeUnit: 's', xAxisFormat: 'mm:ss' },
  '1h': { totalMinutes: 60, pointCount: 12, energyUnit: 'kW', downtimeUnit: 'm', xAxisFormat: 'HH:mm' },
  '1d': { totalMinutes: 1440, pointCount: 12, energyUnit: 'kWh', downtimeUnit: 'm', xAxisFormat: 'HH:mm' },
  '1w': { totalMinutes: 10080, pointCount: 14, energyUnit: 'kWh', downtimeUnit: 'h', xAxisFormat: 'DD/MM' },
  '1m': { totalMinutes: 43200, pointCount: 15, energyUnit: 'kWh', downtimeUnit: 'h', xAxisFormat: 'DD/MM' },
};

export function getTimeRangeConfig(range: TimeRange): RangeConfig {
  return RANGE_CONFIG[range];
}

export function getTimeAxisLabel(range: TimeRange, locale: LocaleKey): string {
  const format = getTimeRangeConfig(range).xAxisFormat;
  return locale === 'en' ? `Time (${format})` : `Thời gian (${format})`;
}

/**
 * Trả về formatter function cho trục X phù hợp với TimeRange.
 * Dùng làm axisLabel.formatter trong ECharts.
 */
export function getXAxisFormatter(range: TimeRange): (value: string) => string {
  return (value: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value; // fallback: hiển thị nguyên string
    const pad = (n: number) => String(n).padStart(2, '0');
    if (range === '60s') {
      return `${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    if (range === '1h') {
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    if (range === '1d') {
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    // 1w, 1m
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };
}

export function buildTimeAxisLabels(range: TimeRange, locale: LocaleKey): string[] {
  const config = getTimeRangeConfig(range);
  const stepMs = (config.totalMinutes * 60 * 1000) / Math.max(1, config.pointCount - 1);
  const now = Date.now();

  const formatter =
    range === '60s'
      ? new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
          minute: '2-digit',
          second: '2-digit',
        })
      : range === '1h'
      ? new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : range === '1d'
      ? new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
          day: '2-digit',
          month: '2-digit',
        });

  return Array.from({ length: config.pointCount }).map((_, index) => {
    const pointTime = new Date(now - stepMs * (config.pointCount - 1 - index));
    return formatter.format(pointTime);
  });
}

export function normalizeDowntimeMinutes(durationMin: number, range: TimeRange): number {
  const downtimeUnit = getTimeRangeConfig(range).downtimeUnit;

  if (downtimeUnit === 's') {
    return durationMin * 60;
  }

  if (downtimeUnit === 'h') {
    return durationMin / 60;
  }

  return durationMin;
}

export function getDowntimeUnitLabel(range: TimeRange, locale: LocaleKey): string {
  const downtimeUnit = getTimeRangeConfig(range).downtimeUnit;

  if (downtimeUnit === 's') {
    return locale === 'en' ? 's' : 'giây';
  }

  if (downtimeUnit === 'h') {
    return locale === 'en' ? 'h' : 'giờ';
  }

  return locale === 'en' ? 'min' : 'phút';
}

