import type { TimeRange } from '@/components/TimeRangeSelector';

export type LocaleKey = 'en' | 'vi';

interface RangeConfig {
  totalMinutes: number;
  pointCount: number;
  energyUnit: 'kW' | 'kWh';
  downtimeUnit: 's' | 'm' | 'h';
}

const RANGE_CONFIG: Record<TimeRange, RangeConfig> = {
  '60s': { totalMinutes: 1, pointCount: 12, energyUnit: 'kW', downtimeUnit: 's' },
  '1h': { totalMinutes: 60, pointCount: 12, energyUnit: 'kW', downtimeUnit: 'm' },
  '1d': { totalMinutes: 1440, pointCount: 12, energyUnit: 'kWh', downtimeUnit: 'm' },
  '1w': { totalMinutes: 10080, pointCount: 14, energyUnit: 'kWh', downtimeUnit: 'h' },
  '1m': { totalMinutes: 43200, pointCount: 15, energyUnit: 'kWh', downtimeUnit: 'h' },
};

export function getTimeRangeConfig(range: TimeRange): RangeConfig {
  return RANGE_CONFIG[range];
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
      : range === '1h' || range === '1d'
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

