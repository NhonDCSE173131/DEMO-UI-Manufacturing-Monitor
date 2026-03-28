'use client';

import { BarChart3 } from 'lucide-react';

interface ChartNoDataProps {
  title?: string;
  message?: string;
  height?: string;
}

/**
 * Component hiển thị khi chart không có dữ liệu từ backend
 * Không dùng dữ liệu random/mock
 */
export function ChartNoData({
  title = 'No Data Available',
  message = 'Backend is unavailable or no data for this period',
  height = 'h-64',
}: ChartNoDataProps) {
  return (
    <div className={`${height} flex flex-col items-center justify-center bg-industrial-darker/30 border border-industrial-border/20 rounded-lg`}>
      <BarChart3 size={48} className="text-industrial-text-secondary mb-3 opacity-50" />
      <p className="text-sm font-semibold text-industrial-text-secondary text-center px-4">{title}</p>
      <p className="text-xs text-industrial-text-secondary/70 text-center px-4 mt-1">{message}</p>
    </div>
  );
}

export function ChartPaused({ 
  reason = 'Realtime paused - waiting for connection',
}: {
  reason?: string;
}) {
  return (
    <div className="h-64 flex flex-col items-center justify-center bg-industrial-darker/50 border border-industrial-warning/30 rounded-lg">
      <div className="text-center">
        <p className="text-sm font-semibold text-industrial-warning mb-2">⏸ Live Paused</p>
        <p className="text-xs text-industrial-warning/80">{reason}</p>
      </div>
    </div>
  );
}

