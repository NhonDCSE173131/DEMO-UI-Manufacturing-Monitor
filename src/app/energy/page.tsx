'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, Zap } from 'lucide-react';
import { TimeRangeSelector, type TimeRange } from '@/components/TimeRangeSelector';
import { useMachineStore } from '@/lib/store';
import { useEnergyAnalytics } from '@/hooks/useEnergyAnalytics';
import { useRealtimeStream } from '@/hooks/useRealtimeStream';
import { getTimeRangeConfig } from '@/lib/time-range-config';
import { formatAreaLabel } from '@/lib/machine-presentation';
import { formatNumber } from '@/lib/utils';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const toAnalyticsQuery = (range: TimeRange, selectedAreaFilter: string, selectedStatusFilter: string) => {
  const rangeConfig = getTimeRangeConfig(range);
  return {
    from: new Date(Date.now() - rangeConfig.totalMinutes * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    interval: range === '60s' ? 'raw' : range === '1h' ? '5m' : range === '1d' ? '1h' : range === '1w' ? '6h' : '1d',
    aggregation: 'avg',
    area: selectedAreaFilter === 'all' ? undefined : selectedAreaFilter,
    status: selectedStatusFilter === 'all' ? undefined : selectedStatusFilter,
  } as const;
};

const EnergyPage = () => {
  const { selectedLanguage, selectedAreaFilter, selectedStatusFilter } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const locale = selectedLanguage === 'en' ? 'en' : 'vi';

  const [overviewRange, setOverviewRange] = useState<TimeRange>('1h');
  const [trendRange, setTrendRange] = useState<TimeRange>('1h');
  const [distributionRange, setDistributionRange] = useState<TimeRange>('1h');
  const [costRange, setCostRange] = useState<TimeRange>('1h');

  const overviewQuery = useMemo(() => toAnalyticsQuery(overviewRange, selectedAreaFilter, selectedStatusFilter), [overviewRange, selectedAreaFilter, selectedStatusFilter]);
  const trendQuery = useMemo(() => toAnalyticsQuery(trendRange, selectedAreaFilter, selectedStatusFilter), [trendRange, selectedAreaFilter, selectedStatusFilter]);
  const distributionQuery = useMemo(() => toAnalyticsQuery(distributionRange, selectedAreaFilter, selectedStatusFilter), [distributionRange, selectedAreaFilter, selectedStatusFilter]);
  const costQuery = useMemo(() => toAnalyticsQuery(costRange, selectedAreaFilter, selectedStatusFilter), [costRange, selectedAreaFilter, selectedStatusFilter]);

  const overviewData = useEnergyAnalytics(overviewQuery);
  const trendData = useEnergyAnalytics(trendQuery);
  const distributionData = useEnergyAnalytics(distributionQuery);
  const costData = useEnergyAnalytics(costQuery);

  const realtime = useRealtimeStream({
    enabled: true,
    topics: ['telemetry', 'connection'],
  });

  const overview = overviewData.overview || {};
  const totalPowerNow = Number(overview.currentPowerKw ?? overview.plantPowerKw ?? 0);
  const peakPower = Number(overview.peakPowerKw ?? 0);
  const totalEnergyToday = Number(overview.todayEnergyKwh ?? 0);
  const totalEnergyMonth = Number(overview.monthEnergyKwh ?? 0);
  const costToday = Number(costData.cost?.todayCost ?? overview.todayCost ?? 0);
  const costMonth = Number(costData.cost?.monthCost ?? overview.monthCost ?? 0);
  const costPerKwh = Number(costData.cost?.costPerKwh ?? overview.costPerKwh ?? 0);

  const machineDistribution = distributionData.byMachine
    .map((item) => ({
      label: String(item.machineCode || item.machineName || item.label || item.key || item.id || ''),
      value: Number(item.value ?? item.total ?? 0),
    }))
    .filter((item) => item.label.length > 0);

  const areaDistribution = distributionData.byArea
    .map((item) => ({
      area: String(item.area || item.label || item.key || item.id || ''),
      value: Number(item.value ?? item.total ?? 0),
      unit: String(item.unit || 'kWh'),
    }))
    .filter((item) => item.area.length > 0);

  const trendPoints = trendData.trend.map((point, index) => ({
    label: String(point.label || point.timestamp || `#${index + 1}`),
    value: Number(point.value ?? point.energyKwh ?? point.powerKw ?? 0),
    unit: String(point.unit || ''),
  }));

  const costTrend = costData.cost?.costTrend || [];

  const distributionOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        label: { color: '#8fb3d9' },
        data: machineDistribution.map((item) => ({ name: item.label, value: item.value })),
      },
    ],
  };

  const trendOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: trendPoints.map((item) => item.label),
      axisLabel: { color: '#8fb3d9' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9' },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#17a2b8', width: 2 },
        data: trendPoints.map((item) => item.value),
      },
    ],
  };

  const costTrendOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: costTrend.map((point, index) => String(point.label || point.timestamp || `#${index + 1}`)),
      axisLabel: { color: '#8fb3d9' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9' },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#facc15', width: 2 },
        data: costTrend.map((point) => Number(point.cost ?? point.value ?? 0)),
      },
    ],
  };

  const isLoading = overviewData.loading || trendData.loading || distributionData.loading || costData.loading;
  const backendError = overviewData.error || trendData.error || distributionData.error || costData.error;

  return (
    <div className="space-y-6 animate-fade-in">
      {(isLoading || backendError) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {isLoading
            ? selectedLanguage === 'en'
              ? 'Loading energy analytics from backend...'
              : 'Dang tai phan tich nang luong tu backend...'
            : selectedLanguage === 'en'
            ? `Backend unavailable. ${backendError || ''}`
            : `Backend tam thoi khong phan hoi. ${backendError || ''}`}
        </div>
      )}

      <div className="card-industrial p-4 flex items-center justify-between">
        <div className="text-xs text-industrial-text-secondary">
          {selectedLanguage === 'en' ? 'Realtime state:' : 'Trang thai thoi gian thuc:'} <span className="text-industrial-text">{realtime.status}</span>
        </div>
        <TimeRangeSelector value={overviewRange} onChange={setOverviewRange} showLabel={false} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.currentPowerKw}</p>
          <p className="metric-number text-industrial-success">{formatNumber(totalPowerNow, 1)} kW</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.peakPowerToday}</p>
          <p className="metric-number text-industrial-warning">{formatNumber(peakPower, 1)} kW</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.energyToday}</p>
          <p className="metric-number text-industrial-border">{formatNumber(totalEnergyToday, 1)} kWh</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.energyMonth}</p>
          <p className="metric-number text-industrial-text">{formatNumber(totalEnergyMonth, 1)} kWh</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Zap size={16} /> {messages.energy.powerDistributionByMachine}</h3>
            <TimeRangeSelector value={distributionRange} onChange={setDistributionRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={distributionOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{messages.energy.powerTrendChart}</h3>
            <TimeRangeSelector value={trendRange} onChange={setTrendRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4"><Activity size={16} /> {messages.energy.energyByArea}</h3>
          <div className="space-y-3">
            {areaDistribution.map((item) => (
              <div key={item.area} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-semibold text-industrial-text">{formatAreaLabel(item.area, locale)}</p>
                  <p className="text-sm text-industrial-border font-bold">{formatNumber(item.value, 1)} {item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{messages.energy.costTrend}</h3>
            <TimeRangeSelector value={costRange} onChange={setCostRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={costTrendOption} style={{ height: '100%', width: '100%' }} /></div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-industrial-text-secondary">{messages.energy.costToday}</p>
              <p className="font-bold text-industrial-border">${formatNumber(costToday, 2)}</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-industrial-text-secondary">{messages.energy.costMonth}</p>
              <p className="font-bold text-industrial-success">${formatNumber(costMonth, 2)}</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-industrial-text-secondary">{messages.energy.costPerUnit}</p>
              <p className="font-bold text-industrial-text">${formatNumber(costPerKwh, 3)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyPage;

