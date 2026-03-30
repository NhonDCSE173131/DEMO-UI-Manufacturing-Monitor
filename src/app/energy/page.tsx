'use client';

import { useMachineStore } from '@/lib/store';
import { useRealtimeStore } from '@/lib/realtime-store';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useEnergyAnalytics } from '@/hooks/useEnergyAnalytics';
import { formatNumber } from '@/lib/utils';
import { Zap, Activity } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { useMemo, useState } from 'react';
import { buildTimeAxisLabels, getTimeRangeConfig } from '@/lib/time-range-config';
import { ChartNoData } from '@/components/ChartNoData';

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
  const { connectionStatus, telemetrySeriesByMachineId } = useRealtimeStore();
  const { machines, loading: machinesLoading, error: machinesError } = useMachinesData();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const [distributionRange, setDistributionRange] = useState<TimeRange>('1h');
  const [trendRange, setTrendRange] = useState<TimeRange>('1h');
  const distributionQuery = useMemo(
    () => toAnalyticsQuery(distributionRange, selectedAreaFilter, selectedStatusFilter),
    [distributionRange, selectedAreaFilter, selectedStatusFilter],
  );
  const trendQuery = useMemo(
    () => toAnalyticsQuery(trendRange, selectedAreaFilter, selectedStatusFilter),
    [trendRange, selectedAreaFilter, selectedStatusFilter],
  );
  const distributionAnalytics = useEnergyAnalytics(distributionQuery);
  const trendAnalytics = useEnergyAnalytics(trendQuery);
  const overview = trendAnalytics.overview || distributionAnalytics.overview;

  const filteredMachines = machines.filter((machine) => {
    const matchArea = selectedAreaFilter === 'all' || machine.area === selectedAreaFilter;
    const matchStatus = selectedStatusFilter === 'all' || machine.status === selectedStatusFilter;
    return matchArea && matchStatus;
  });

  const displayMachines = filteredMachines.length > 0 ? filteredMachines : machines;

  const totalPowerNow = Number(overview?.currentPowerKw ?? overview?.plantPowerKw ?? displayMachines.reduce((sum, m) => sum + m.powerKw, 0));
  const peakPower = Math.max(...displayMachines.map((m) => m.powerKw)) * 1.2;
  const totalEnergyToday = Number(overview?.todayEnergyKwh ?? displayMachines.reduce((sum, m) => sum + m.energyTodayKwh, 0));
  const totalEnergyMonth = Number(overview?.monthEnergyKwh ?? displayMachines.reduce((sum, m) => sum + m.energyMonthKwh, 0));
  const costPerKwh = Number(trendAnalytics.cost?.costPerKwh ?? overview?.costPerKwh ?? 0.12);
  const costToday = Number(trendAnalytics.cost?.todayCost ?? overview?.todayCost ?? (totalEnergyToday * costPerKwh));
  const costMonth = Number(trendAnalytics.cost?.monthCost ?? overview?.monthCost ?? (totalEnergyMonth * costPerKwh));
  const localeKey = selectedLanguage === 'en' ? 'en' : 'vi';
  const distributionConfig = getTimeRangeConfig(distributionRange);
  const trendConfig = getTimeRangeConfig(trendRange);
  const distributionUnit = distributionConfig.energyUnit;
  const trendUnit = trendConfig.energyUnit;
  const trendAxisLabels = buildTimeAxisLabels(trendRange, localeKey);

  const normalizeEnergyValue = (powerKw: number, range: TimeRange) => {
    const config = getTimeRangeConfig(range);
    if (config.energyUnit === 'kW') {
      return powerKw;
    }
    return (powerKw * config.totalMinutes) / 60;
  };

  const pieChartOption = {
    tooltip: { trigger: 'item' },
    legend: { 
       type: 'scroll',
       bottom: 0,
       textStyle: { color: '#8fb3d9' },
       pageTextStyle: { color: '#8fb3d9' },
       pageIconColor: '#17a2b8'
    },
    series: [
      {
        name: selectedLanguage === 'en' ? `Power (${distributionUnit})` : `Công suất (${distributionUnit})`,
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#0B213F',
          borderWidth: 2
        },
        label: { show: false },
        data: (distributionAnalytics.byMachine.length > 0
          ? distributionAnalytics.byMachine.map((m) => ({
              value: Number(m.value ?? m.total ?? 0),
              name: String(m.machineCode || m.machineName || m.label || m.key || m.id || 'N/A'),
            }))
          : displayMachines.map((m) => ({ value: normalizeEnergyValue(m.powerKw, distributionRange), name: m.code })))
      }
    ]
  };

  // Energy trend: API → SSE telemetry fallback
  const energyTrendFromApi = trendAnalytics.trend.length > 0
    ? trendAnalytics.trend.map((p) => Number(p.value ?? p.energyKwh ?? p.powerKw ?? 0))
    : null;

  const energyTrendFromSse = useMemo(() => {
    if (energyTrendFromApi) return null;
    const windowMs = trendConfig.totalMinutes * 60 * 1000;
    const fromMs = Date.now() - windowMs;
    const allPoints: { ts: number; powerKw: number }[] = [];
    for (const series of Object.values(telemetrySeriesByMachineId)) {
      for (const p of series) {
        const ts = new Date(p.timestamp).getTime();
        if (ts >= fromMs && p.powerKw != null) {
          allPoints.push({ ts, powerKw: p.powerKw });
        }
      }
    }
    if (allPoints.length === 0) return null;
    const bucketCount = trendConfig.pointCount;
    const bucketSize = windowMs / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }));
    for (const p of allPoints) {
      const idx = Math.min(bucketCount - 1, Math.floor((p.ts - fromMs) / bucketSize));
      buckets[idx].sum += p.powerKw;
      buckets[idx].count += 1;
    }
    return buckets.map((b) => (b.count > 0 ? Math.round((b.sum / b.count) * 100) / 100 : 0));
  }, [energyTrendFromApi, telemetrySeriesByMachineId, trendConfig.totalMinutes, trendConfig.pointCount]);

  const energyTrendData = energyTrendFromApi ?? energyTrendFromSse;
  const hasEnergyTrendData = energyTrendData != null && energyTrendData.length > 0;

  const energyTrendOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '3%', top: '10%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: trendAnalytics.trend.length > 0 ? trendAnalytics.trend.map((p) => String(p.label || p.timestamp || '')) : trendAxisLabels,
      axisLabel: { color: '#8fb3d9' },
      axisLine: { lineStyle: { color: '#28445f' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9', formatter: `{value} ${trendUnit}` },
      splitLine: { lineStyle: { color: '#1a2a3a' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#17a2b8', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(23,162,184,0.35)' },
              { offset: 1, color: 'rgba(23,162,184,0.05)' },
            ],
          },
        },
        data: energyTrendData,
      },
    ],
  };

  const areaConsumption = trendAnalytics.byArea.length > 0
    ? trendAnalytics.byArea.reduce((acc: Record<string, number>, item) => {
        const key = String(item.area || item.label || item.key || item.id || 'UNKNOWN');
        acc[key] = (acc[key] || 0) + Number(item.value ?? item.total ?? 0);
        return acc;
      }, {})
    : displayMachines.reduce((acc: Record<string, number>, machine) => {
        acc[machine.area] = (acc[machine.area] || 0) + machine.energyTodayKwh;
        return acc;
      }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      {(machinesLoading || trendAnalytics.loading || distributionAnalytics.loading || machinesError || trendAnalytics.error || distributionAnalytics.error) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {machinesLoading || trendAnalytics.loading || distributionAnalytics.loading
            ? (selectedLanguage === 'en' ? 'Loading energy analytics from backend...' : 'Đang tải phân tích năng lượng từ backend...')
            : `${selectedLanguage === 'en' ? 'Backend unavailable. Showing local fallback.' : 'Backend tạm thời không phản hồi. Đang hiển thị dữ liệu dự phòng.'} ${machinesError || trendAnalytics.error || distributionAnalytics.error || ''}`}
        </div>
      )}
      {/* Power KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.currentPowerKw}</p>
          <div className="flex items-end gap-2">
            <p className="metric-number text-industrial-success">{formatNumber(totalPowerNow, 1)}</p>
            <span className="text-industrial-success mb-1">{messages.energy.powerKw}</span>
          </div>
          <p className="text-xs text-industrial-text-secondary mt-2">{messages.energy.currentLoad}</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.peakPowerToday}</p>
          <p className="metric-number text-industrial-warning">{formatNumber(peakPower, 1)}</p>
          <p className="text-xs text-industrial-text-secondary mt-2">{messages.energy.peakCapacity}</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.energyToday}</p>
           <div className="flex items-end gap-2">
            <p className="metric-number text-industrial-border">{formatNumber(totalEnergyToday, 1)}</p>
            <span className="text-industrial-text-secondary mb-1">{messages.energy.kWh}</span>
          </div>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.energyMonth}</p>
          <div className="flex items-end gap-2">
            <p className="metric-number text-industrial-text">{formatNumber(totalEnergyMonth, 0)}</p>
            <span className="text-industrial-text-secondary mb-1">{messages.energy.kWh}</span>
          </div>
        </div>
      </div>

      {/* Cost Analysis & Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-industrial p-6 flex flex-col">
          <h3 className="text-industrial-border font-semibold mb-4">
            {messages.energy.costAnalysis}
          </h3>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="bg-industrial-darker p-4 rounded-lg flex flex-col justify-center items-center text-center">
              <p className="text-sm text-industrial-text-secondary mb-1">{messages.energy.today}</p>
              <p className="text-4xl font-bold text-industrial-border">${formatNumber(costToday, 2)}</p>
            </div>
            <div className="bg-industrial-darker p-4 rounded-lg flex flex-col justify-center items-center text-center">
              <p className="text-sm text-industrial-text-secondary mb-1">{messages.energy.costMonth}</p>
              <p className="text-4xl font-bold text-industrial-success">${formatNumber(costMonth, 2)}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-industrial-border/20 mt-4">
            <p className="text-sm text-industrial-text-secondary flex justify-between">
              <span>{messages.energy.costPerUnit}</span>
              <span className="font-bold text-industrial-text">${costPerKwh}</span>
            </p>
          </div>
        </div>

        <div className="card-industrial p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="panel-title">
              {messages.energy.powerDistributionByMachine}
            </h3>
            <TimeRangeSelector value={distributionRange} onChange={setDistributionRange} showLabel={false} />
          </div>
          <div className="flex-1 min-h-[280px] mt-2 relative">
            <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{messages.energy.powerTrendChart}</h3>
            <TimeRangeSelector value={trendRange} onChange={setTrendRange} showLabel={false} />
          </div>
          <div className="h-64">
            {hasEnergyTrendData ? (
              <ReactECharts option={energyTrendOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu xu hướng điện năng' : 'No energy trend data'}
                message={selectedLanguage === 'vi' ? 'Đang chờ dữ liệu từ backend qua SSE.' : 'Waiting for backend data via SSE.'}
              />
            )}
          </div>
        </div>

        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">{messages.energy.energyByArea}</h3>
          <div className="space-y-3">
            {Object.entries(areaConsumption).map(([area, energy]) => {
              const pct = totalEnergyToday > 0 ? (energy / totalEnergyToday) * 100 : 0;
              return (
                <div key={area} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-industrial-text">{area}</p>
                    <p className="text-sm text-industrial-border font-bold">{formatNumber(energy, 1)} kWh</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-industrial-card overflow-hidden">
                    <div className="h-full bg-industrial-border" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">
            <Activity size={18} />
            {messages.energy.powerQuality}
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-industrial-text-secondary">{messages.energy.voltage}</span>
                <span className="text-sm font-bold text-industrial-success">400.2 V</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div className="h-full bg-industrial-success rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-industrial-text-secondary">{messages.energy.frequency}</span>
                <span className="text-sm font-bold text-industrial-success">50.1 Hz</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div className="h-full bg-industrial-success rounded-full" style={{ width: '99%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-industrial-text-secondary">{messages.energy.powerFactor}</span>
                <span className="text-sm font-bold text-industrial-warning">0.94</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div className="h-full bg-industrial-warning rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Power Distribution list */}
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">
            {messages.energy.powerDistributionByMachine}
          </h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {displayMachines.map((machine) => {
              const percentage = totalPowerNow > 0 ? (machine.powerKw / totalPowerNow) * 100 : 0;
              return (
                <div key={machine.id} className="bg-industrial-darker p-3 rounded-lg border border-industrial-border/10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-industrial-border/30">
                        <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-industrial-text">{machine.name}</p>
                        <p className="text-xs text-industrial-text-secondary">{machine.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-industrial-border">
                        {formatNumber(machine.powerKw, 1)} {messages.energy.powerKw}
                      </p>
                      <p className="text-xs text-industrial-text-secondary">{formatNumber(percentage, 0)}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-industrial-card">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          machine.status === 'RUN'
                            ? '#22c55e'
                            : machine.status === 'FAULT'
                            ? '#ef4444'
                            : '#60a5fa',
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyPage;

