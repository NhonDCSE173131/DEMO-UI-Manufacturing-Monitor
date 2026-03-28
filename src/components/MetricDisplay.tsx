'use client';

import { useRealtimeStore } from '@/lib/realtime-store';

interface MetricDisplayProps {
  machineId: string;
  value: number | undefined | null;
  format?: (val: number) => string;
  unit?: string;
  fallback?: string;
  showDash?: boolean;
  freshnessSec?: number;
}

/**
 * Helper component để display metric value.
 * Nếu máy không live (app disconnected, machine offline, data stale)
 * thì hiển thị "--" hoặc fallback, không hiển thị giá trị cũ.
 */
export function MetricDisplay({
  machineId,
  value,
  format,
  unit = '',
  fallback = '--',
  showDash = true,
  freshnessSec = 30,
}: MetricDisplayProps) {
  const { shouldShowLiveMetrics } = useRealtimeStore();
  
  // Nếu không nên hiện live metrics hoặc không có value, hiện dash/fallback
  if (!shouldShowLiveMetrics(machineId, freshnessSec) || value === undefined || value === null) {
    return showDash ? <span className="text-industrial-text-secondary">{fallback}</span> : null;
  }

  const formatted = format ? format(value) : String(value);
  return (
    <span className="text-industrial-text">
      {formatted}{unit && <span className="text-xs ml-1">{unit}</span>}
    </span>
  );
}

interface MachineStateDisplayProps {
  machineId: string;
  freshnessSec?: number;
}

/**
 * Hiển thị lý do máy không live nếu cần.
 */
export function MachineStateDisplay({ machineId, freshnessSec = 30 }: MachineStateDisplayProps) {
  const { connectionStatus, connectionStateByMachineId, dataFreshnessByMachineId } = useRealtimeStore();

  if (connectionStatus !== 'live') {
    return (
      <div className="text-xs text-industrial-warning">
        Kết nối backend: {connectionStatus === 'connecting' ? 'Đang kết nối...' : 'Mất kết nối'}
      </div>
    );
  }

  const machineConnState = connectionStateByMachineId[machineId];
  if (machineConnState && machineConnState !== 'ONLINE') {
    const freshness = dataFreshnessByMachineId[machineId];
    const freshText = freshness ? ` (${freshness}s)` : '';
    return <div className="text-xs text-industrial-warning">Máy {machineConnState}{freshText}</div>;
  }

  const freshness = dataFreshnessByMachineId[machineId];
  if (freshness && freshness > freshnessSec) {
    return <div className="text-xs text-industrial-warning">Dữ liệu cũ {freshness}s</div>;
  }

  return null;
}

