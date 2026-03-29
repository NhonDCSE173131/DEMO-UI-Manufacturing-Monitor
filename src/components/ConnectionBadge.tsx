'use client';

import type { ConnectionStateType } from '@/types';

interface ConnectionBadgeProps {
  connectionState?: ConnectionStateType;
  lastSeenAt?: string;
  dataFreshnessSec?: number;
  /** Ngôn ngữ hiển thị */
  lang?: 'vi' | 'en';
  /** Kích cỡ badge */
  size?: 'sm' | 'xs';
}

const labels: Record<ConnectionStateType, { vi: string; en: string; color: string; dot: string }> = {
  ONLINE: {
    vi: 'Trực tuyến',
    en: 'Online',
    color: 'bg-green-500/15 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  STALE: {
    vi: 'Dữ liệu cũ',
    en: 'Stale data',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  OFFLINE: {
    vi: 'Mất kết nối',
    en: 'Offline',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
};

export function ConnectionBadge({ connectionState, lang = 'vi', size = 'sm' }: ConnectionBadgeProps) {
  if (!connectionState) return null;
  const { vi: viLabel, en: enLabel, color, dot } = labels[connectionState];
  const label = lang === 'vi' ? viLabel : enLabel;
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold ${textSize} ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${connectionState === 'ONLINE' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

/**
 * Trả về giá trị live hoặc '--' tùy trạng thái kết nối.
 * @param value Giá trị số từ store
 * @param connectionState Trạng thái kết nối của máy
 * @param formatter Hàm format (vd: formatNumber)
 * @param useMock Đang ở chế độ mock không
 */
export function liveMetricValue(
  value: number | undefined | null,
  connectionState: ConnectionStateType | undefined,
  formatter: (v: number) => string,
  useMock: boolean,
): string {
  // Mock mode: luôn hiện số
  if (useMock) {
    return value !== undefined && value !== null ? formatter(value) : '--';
  }
  // Live mode: chỉ hiện số khi ONLINE và có giá trị
  if (connectionState !== 'ONLINE') return '--';
  if (value === undefined || value === null) return '--';
  return formatter(value);
}

