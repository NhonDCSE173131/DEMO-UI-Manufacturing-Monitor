/**
 * Chart Y-axis formatters cho từng loại metric.
 * Dùng làm axisLabel.formatter trong ECharts.
 */
import type { TimeRange } from '@/components/TimeRangeSelector';
import { getDowntimeUnitLabel, type LocaleKey } from './time-range-config';

/** Formatter cho trục Y công suất kW */
export const powerFormatter = (value: number) => `${value} kW`;

/** Formatter cho trục Y năng lượng kWh */
export const energyFormatter = (value: number) => `${value} kWh`;

/** Formatter cho trục Y nhiệt độ °C */
export const temperatureFormatter = (value: number) => `${value}°C`;

/** Formatter cho trục Y rung động mm/s */
export const vibrationFormatter = (value: number) => `${value} mm/s`;

/** Formatter cho trục Y OEE / % */
export const percentFormatter = (value: number) => `${value}%`;

/** Formatter cho trục Y thời gian ngừng máy (phụ thuộc vào range) */
export const downtimeFormatter = (range: TimeRange, locale: LocaleKey = 'vi') => {
  const unit = getDowntimeUnitLabel(range, locale);
  return (value: number) => `${value} ${unit}`;
};

/** Formatter cho trục Y chi phí */
export const costFormatter = (value: number) => `$${value}`;

/**
 * Trả về formatter cho Y-axis phù hợp với loại metric
 */
export const getYAxisFormatter = (metric: 'power' | 'energy' | 'temperature' | 'vibration' | 'oee' | 'percent' | 'cost') => {
  switch (metric) {
    case 'power': return powerFormatter;
    case 'energy': return energyFormatter;
    case 'temperature': return temperatureFormatter;
    case 'vibration': return vibrationFormatter;
    case 'oee':
    case 'percent': return percentFormatter;
    case 'cost': return costFormatter;
    default: return (v: number) => String(v);
  }
};

/**
 * Trả về tên đơn vị cho trục Y
 */
export const getYAxisUnit = (metric: 'power' | 'energy' | 'temperature' | 'vibration' | 'oee' | 'percent' | 'cost', locale: LocaleKey = 'vi'): string => {
  const units = {
    power: 'kW',
    energy: 'kWh',
    temperature: '°C',
    vibration: 'mm/s',
    oee: '%',
    percent: '%',
    cost: 'VNĐ',
  };
  return units[metric] || '';
};

