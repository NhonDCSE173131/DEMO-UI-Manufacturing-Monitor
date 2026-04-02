import type { TimeRange } from '@/components/TimeRangeSelector';
import type { TelemetryPoint } from '@/lib/realtime-store';
import { getTimeRangeConfig, type LocaleKey } from '@/lib/time-range-config';

interface BuildTelemetryTrendWindowOptions {
  seriesByMachineId: Record<string, TelemetryPoint[]>;
  windowMs: number;
  bucketCount: number;
  locale: LocaleKey;
  metricSelector: (point: TelemetryPoint) => number | null | undefined;
  digits?: number;
  timeStyle?: 'mm:ss' | 'HH:mm' | 'HH:mm:ss' | 'DD/MM';
}

const toRounded = (value: number, digits: number): number => {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
};

const getDateFormatter = (locale: LocaleKey, style: NonNullable<BuildTelemetryTrendWindowOptions['timeStyle']>) => {
  const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';
  if (style === 'mm:ss') {
    return new Intl.DateTimeFormat(localeTag, { minute: '2-digit', second: '2-digit' });
  }
  if (style === 'HH:mm:ss') {
    return new Intl.DateTimeFormat(localeTag, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (style === 'DD/MM') {
    return new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: '2-digit' });
  }
  return new Intl.DateTimeFormat(localeTag, { hour: '2-digit', minute: '2-digit' });
};

export const buildTelemetryTrendWindow = ({
  seriesByMachineId,
  windowMs,
  bucketCount,
  locale,
  metricSelector,
  digits = 2,
  timeStyle = 'HH:mm',
}: BuildTelemetryTrendWindowOptions): { labels: string[]; values: Array<number | null> } | null => {
  if (windowMs <= 0 || bucketCount <= 0) return null;

  const parsedPoints: Array<{ ts: number; value: number }> = [];
  let latestTs = Number.NEGATIVE_INFINITY;

  for (const series of Object.values(seriesByMachineId)) {
    for (const point of series) {
      const value = metricSelector(point);
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const ts = new Date(point.timestamp).getTime();
      if (!Number.isFinite(ts)) continue;
      parsedPoints.push({ ts, value });
      if (ts > latestTs) latestTs = ts;
    }
  }

  if (!Number.isFinite(latestTs) || parsedPoints.length === 0) return null;

  const bucketSizeMs = Math.max(1000, Math.floor(windowMs / bucketCount));
  const alignedLatestTs = Math.floor(latestTs / bucketSizeMs) * bucketSizeMs;
  const fromTs = alignedLatestTs - bucketSizeMs * (bucketCount - 1);

  const buckets = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }));
  for (const point of parsedPoints) {
    if (point.ts < fromTs || point.ts > alignedLatestTs) continue;
    const index = Math.floor((point.ts - fromTs) / bucketSizeMs);
    if (index < 0 || index >= bucketCount) continue;
    buckets[index].sum += point.value;
    buckets[index].count += 1;
  }

  const formatter = getDateFormatter(locale, timeStyle);
  const labels = Array.from({ length: bucketCount }, (_, index) =>
    formatter.format(new Date(fromTs + index * bucketSizeMs)),
  );
  const values = buckets.map((bucket) =>
    bucket.count > 0 ? toRounded(bucket.sum / bucket.count, digits) : null,
  );

  return { labels, values };
};

const timeStyleByRange: Record<TimeRange, NonNullable<BuildTelemetryTrendWindowOptions['timeStyle']>> = {
  '60s': 'mm:ss',
  '1h': 'HH:mm',
  '1d': 'HH:mm',
  '1w': 'DD/MM',
  '1m': 'DD/MM',
};

export const buildTelemetryTrendForRange = (params: {
  seriesByMachineId: Record<string, TelemetryPoint[]>;
  range: TimeRange;
  locale: LocaleKey;
  metricSelector: (point: TelemetryPoint) => number | null | undefined;
  digits?: number;
}) => {
  const config = getTimeRangeConfig(params.range);
  return buildTelemetryTrendWindow({
    seriesByMachineId: params.seriesByMachineId,
    windowMs: config.totalMinutes * 60 * 1000,
    bucketCount: config.pointCount,
    locale: params.locale,
    metricSelector: params.metricSelector,
    digits: params.digits,
    timeStyle: timeStyleByRange[params.range],
  });
};

