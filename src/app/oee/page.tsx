'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, AlertTriangle, CalendarClock, Package } from 'lucide-react';
import { TimeRangeSelector, type TimeRange } from '@/components/TimeRangeSelector';
import { useMachineStore } from '@/lib/store';
import { useOeeAnalytics } from '@/hooks/useOeeAnalytics';
import { useRealtimeStream } from '@/hooks/useRealtimeStream';
import { getTimeRangeConfig } from '@/lib/time-range-config';
import { formatNumber } from '@/lib/utils';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const toOeeQuery = (range: TimeRange, selectedShift: string, selectedAreaFilter: string, selectedStatusFilter: string) => {
  const rangeConfig = getTimeRangeConfig(range);
  return {
    from: new Date(Date.now() - rangeConfig.totalMinutes * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    interval: range === '60s' ? 'raw' : range === '1h' ? '5m' : range === '1d' ? '1h' : range === '1w' ? '6h' : '1d',
    aggregation: 'avg',
    shift: selectedShift === 'all' ? undefined : selectedShift,
    area: selectedAreaFilter === 'all' ? undefined : selectedAreaFilter,
    status: selectedStatusFilter === 'all' ? undefined : selectedStatusFilter,
  } as const;
};

const OEEPage = () => {
  const { selectedLanguage, selectedShift, selectedAreaFilter, selectedStatusFilter } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const [overviewRange, setOverviewRange] = useState<TimeRange>('1h');
  const [trendRange, setTrendRange] = useState<TimeRange>('1h');
  const [rankingRange, setRankingRange] = useState<TimeRange>('1h');
  const [lossRange, setLossRange] = useState<TimeRange>('1h');

  const overviewQuery = useMemo(() => toOeeQuery(overviewRange, selectedShift, selectedAreaFilter, selectedStatusFilter), [overviewRange, selectedShift, selectedAreaFilter, selectedStatusFilter]);
  const trendQuery = useMemo(() => toOeeQuery(trendRange, selectedShift, selectedAreaFilter, selectedStatusFilter), [trendRange, selectedShift, selectedAreaFilter, selectedStatusFilter]);
  const rankingQuery = useMemo(() => toOeeQuery(rankingRange, selectedShift, selectedAreaFilter, selectedStatusFilter), [rankingRange, selectedShift, selectedAreaFilter, selectedStatusFilter]);
  const lossQuery = useMemo(() => toOeeQuery(lossRange, selectedShift, selectedAreaFilter, selectedStatusFilter), [lossRange, selectedShift, selectedAreaFilter, selectedStatusFilter]);

  const overviewData = useOeeAnalytics(overviewQuery);
  const trendData = useOeeAnalytics(trendQuery);
  const rankingData = useOeeAnalytics(rankingQuery);
  const lossData = useOeeAnalytics(lossQuery);

  const realtime = useRealtimeStream({
    enabled: true,
    topics: ['telemetry', 'alarm', 'connection'],
  });

  const overview = overviewData.overview || {};
  const avgOEE = Number(overview.avgOee ?? overview.oee ?? 0);
  const avgAvailability = Number(overview.avgAvailability ?? overview.availability ?? 0);
  const avgPerformance = Number(overview.avgPerformance ?? overview.performance ?? 0);
  const avgQuality = Number(overview.avgQuality ?? overview.quality ?? 0);
  const totalOutput = Number(overview.totalOutput ?? 0);
  const goodOutput = Number(overview.goodOutput ?? 0);
  const rejectOutput = Number(overview.rejectOutput ?? 0);
  const targetOutput = Number(overview.targetOutput ?? 0);
  const workOrder = String(overview.workOrder || 'N/A');
  const shiftLabel = String(overview.shiftName || selectedShift);

  const trendPoints = trendData.trend.map((point, index) => ({
    label: String(point.label || point.timestamp || `#${index + 1}`),
    oee: Number(point.oee ?? point.value ?? 0),
  }));

  const rankingItems = rankingData.byMachine
    .map((item) => ({
      label: String(item.machineCode || item.machineName || item.label || item.key || item.id || ''),
      oee: Number(item.oee ?? item.value ?? 0),
    }))
    .filter((item) => item.label.length > 0);

  const lossItems = lossData.losses
    .map((item) => ({
      label: String(item.label || item.key || item.name || item.id || ''),
      value: Number(item.lossPercent ?? item.lossMinutes ?? item.value ?? 0),
      unit: String(item.unit || '%'),
    }))
    .filter((item) => item.label.length > 0);

  const trendOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: trendPoints.map((item) => item.label),
      axisLabel: { color: '#8fb3d9' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#8fb3d9', formatter: '{value}%' },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#17a2b8', width: 2 },
        data: trendPoints.map((item) => item.oee),
      },
    ],
  };

  const rankingOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: rankingItems.map((item) => item.label),
      axisLabel: { color: '#8fb3d9' },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#8fb3d9', formatter: '{value}%' },
    },
    series: [
      {
        type: 'bar',
        data: rankingItems.map((item) => item.oee),
        itemStyle: { color: '#17a2b8' },
      },
    ],
  };

  const lossOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: lossItems.map((item) => item.label),
      axisLabel: { color: '#8fb3d9', rotate: 15 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9' },
    },
    series: [
      {
        type: 'bar',
        data: lossItems.map((item) => item.value),
        itemStyle: { color: '#ef4444' },
      },
    ],
  };

  const isLoading = overviewData.loading || trendData.loading || rankingData.loading || lossData.loading;
  const backendError = overviewData.error || trendData.error || rankingData.error || lossData.error;

  return (
    <div className="space-y-6 animate-fade-in">
      {(isLoading || backendError) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {isLoading
            ? selectedLanguage === 'en'
              ? 'Loading OEE analytics from backend...'
              : 'Dang tai phan tich OEE tu backend...'
            : selectedLanguage === 'en'
            ? `Backend unavailable. ${backendError || ''}`
            : `Backend tam thoi khong phan hoi. ${backendError || ''}`}
        </div>
      )}

      <div className="card-industrial p-4 flex flex-wrap gap-3 items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-industrial-text-secondary"><CalendarClock size={16} className="text-industrial-border" />{selectedLanguage === 'en' ? 'Shift context:' : 'Ngu canh ca:'} <strong className="text-industrial-text">{shiftLabel}</strong></div>
        <div className="flex items-center gap-2 text-industrial-text-secondary"><Package size={16} className="text-industrial-info" />{selectedLanguage === 'en' ? 'Work order:' : 'Lenh san xuat:'} <strong className="text-industrial-text">{workOrder}</strong></div>
        <div className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Realtime state:' : 'Trang thai thoi gian thuc:'} <span className="text-industrial-text">{realtime.status}</span></div>
        <TimeRangeSelector value={overviewRange} onChange={setOverviewRange} showLabel={false} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-industrial p-6"><p className="metric-label">{messages.oee.overallOee}</p><p className="metric-number text-industrial-border">{formatNumber(avgOEE, 1)}%</p></div>
        <div className="card-industrial p-6"><p className="metric-label">{messages.oee.availability}</p><p className="metric-number text-industrial-success">{formatNumber(avgAvailability, 1)}%</p></div>
        <div className="card-industrial p-6"><p className="metric-label">{messages.oee.performance}</p><p className="metric-number text-industrial-info">{formatNumber(avgPerformance, 1)}%</p></div>
        <div className="card-industrial p-6"><p className="metric-label">{messages.oee.quality}</p><p className="metric-number text-industrial-warning">{formatNumber(avgQuality, 1)}%</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Activity size={16} /> {messages.oee.byTimeRange}</h3>
            <TimeRangeSelector value={trendRange} onChange={setTrendRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{messages.oee.byMachine}</h3>
            <TimeRangeSelector value={rankingRange} onChange={setRankingRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={rankingOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">{selectedLanguage === 'en' ? 'Output panel' : 'Bang san luong'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Actual' : 'Thuc te'}</p><p className="text-lg font-bold text-industrial-text">{formatNumber(totalOutput, 0)}</p></div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Target' : 'Muc tieu'}</p><p className="text-lg font-bold text-industrial-warning">{formatNumber(targetOutput, 0)}</p></div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Good' : 'Dat'}</p><p className="text-lg font-bold text-industrial-success">{formatNumber(goodOutput, 0)}</p></div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Reject' : 'Loi'}</p><p className="text-lg font-bold text-industrial-error">{formatNumber(rejectOutput, 0)}</p></div>
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><AlertTriangle size={16} /> {messages.oee.rootCauses}</h3>
            <TimeRangeSelector value={lossRange} onChange={setLossRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={lossOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>
      </div>
    </div>
  );
};

export default OEEPage;

