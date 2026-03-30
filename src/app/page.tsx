'use client';

import { useMachineStore } from '@/lib/store';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useAlarmsData } from '@/hooks/useAlarmsData';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { useEnergyAnalytics } from '@/hooks/useEnergyAnalytics';
import { useOeeAnalytics } from '@/hooks/useOeeAnalytics';
import { formatNumber, formatDateTime } from '@/lib/utils';
import { Activity, Zap, CheckCircle, AlertCircle, Settings, Power, BarChart3, ShieldAlert } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import Link from 'next/link';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { useMemo, useState } from 'react';
import { buildTimeAxisLabels, getDowntimeUnitLabel, getTimeRangeConfig, normalizeDowntimeMinutes } from '@/lib/time-range-config';
import { ConnectionBadge, liveMetricValue } from '@/components/ConnectionBadge';
import { ChartNoData } from '@/components/ChartNoData';
import { appEnv } from '@/lib/config/env';
import { useRealtimeStore } from '@/lib/realtime-store';

const toAnalyticsQuery = (range: TimeRange) => {
  const rangeConfig = getTimeRangeConfig(range);
  return {
    from: new Date(Date.now() - rangeConfig.totalMinutes * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    interval: range === '60s' ? 'raw' : range === '1h' ? '5m' : range === '1d' ? '1h' : range === '1w' ? '6h' : '1d',
    aggregation: 'avg',
  } as const;
};

const Dashboard = () => {
  const { selectedLanguage, selectedAreaFilter, selectedStatusFilter } = useMachineStore();
  const { machines, loading: machinesLoading, error: machinesError } = useMachinesData();
  const { events, loading: alarmsLoading, error: alarmsError } = useAlarmsData();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const [oeeRange, setOeeRange] = useState<TimeRange>('1h');
  const [powerRange, setPowerRange] = useState<TimeRange>('1h');
  const [energyRange, setEnergyRange] = useState<TimeRange>('1h');
  const [downtimeRange, setDowntimeRange] = useState<TimeRange>('1h');
  const energyQuery = useMemo(() => toAnalyticsQuery(energyRange), [energyRange]);
  const oeeQuery = useMemo(() => toAnalyticsQuery(oeeRange), [oeeRange]);
  const { overview, loading: overviewLoading, error: overviewError } = useDashboardOverview();
  const energyAnalytics = useEnergyAnalytics(energyQuery);
  const oeeAnalytics = useOeeAnalytics(oeeQuery);
  const localeKey = selectedLanguage === 'en' ? 'en' : 'vi';
  const { isMachineLive, telemetrySeriesByMachineId } = useRealtimeStore();

  /** Dashboard-level helper: is a machine live? */
  const machineIsLive = (machineId: string) => appEnv.useMock || isMachineLive(machineId);
  const fmtDash = (machineId: string, val: number | undefined | null, decimals = 1) => {
    const live = machineIsLive(machineId);
    return liveMetricValue(val, live ? 'ONLINE' : 'OFFLINE', (v) => formatNumber(v, decimals), appEnv.useMock);
  };

  const filteredMachines = machines.filter((machine) => {
    const matchArea = selectedAreaFilter === 'all' || machine.area === selectedAreaFilter;
    const matchStatus = selectedStatusFilter === 'all' || machine.status === selectedStatusFilter;
    return matchArea && matchStatus;
  });

  const displayMachines = filteredMachines.length > 0 ? filteredMachines : machines;

  // ─── KPIs ───────────────────────────────────────────────────
  // Ưu tiên: REST overview (nếu có) → tính từ machines (SSE-patched real-time từ BE)
  // machines đã được SSE patch liên tục bởi RealtimeProvider → useMachinesData,
  // nên giá trị luôn phản ánh data mới nhất BE gửi.
  const totalPower = overview?.plantPowerKw
    ?? (displayMachines.length > 0 ? displayMachines.reduce((sum, m) => sum + m.powerKw, 0) : undefined);
  const totalEnergy = overview?.todayEnergyKwh
    ?? (displayMachines.length > 0 ? displayMachines.reduce((sum, m) => sum + m.energyTodayKwh, 0) : undefined);
  const avgOEE = overview?.todayOee ?? oeeAnalytics.overview?.oee ?? oeeAnalytics.overview?.avgOee
    ?? (displayMachines.length > 0
      ? displayMachines.reduce((sum, m) => sum + m.oee, 0) / displayMachines.length
      : undefined);

  const totalProduction = oeeAnalytics.overview?.totalOutput
    ?? (displayMachines.length > 0 ? displayMachines.reduce((sum, m) => sum + m.partCount, 0) : undefined);
  const totalGood = oeeAnalytics.overview?.goodOutput
    ?? (displayMachines.length > 0 ? displayMachines.reduce((sum, m) => sum + m.goodCount, 0) : undefined);
  const totalNG = oeeAnalytics.overview?.rejectOutput
    ?? (displayMachines.length > 0 ? displayMachines.reduce((sum, m) => sum + m.ngCount, 0) : undefined);

  const productionDataValid =
    totalProduction != null && totalGood != null && totalNG != null
    && totalProduction >= 0 && totalGood >= 0 && totalNG >= 0
    && (totalGood > 0 || totalNG > 0)
    && totalGood + totalNG <= totalProduction + 1;

  const runningMachines = overview?.runningMachines
    ?? displayMachines.filter((m) => m.status === 'RUN').length;
  const faultMachines = displayMachines.filter((m) => m.status === 'FAULT').length;
  const idleMachines = displayMachines.filter((m) => m.status === 'IDLE').length;
  const criticalEvents = events.filter(e => e.severity === 'critical');
  const warningEvents = events.filter(e => e.severity === 'warning');
  const riskMachines = displayMachines.filter(m => m.maintenanceDueDays <= 14).sort((a,b) => a.maintenanceDueDays - b.maintenanceDueDays);

  // ─── Chart data ─────────────────────────────────────────────
  const energyRangeConfig = getTimeRangeConfig(energyRange);
  const powerRangeConfig = getTimeRangeConfig(powerRange);
  const downtimeRangeConfig = getTimeRangeConfig(downtimeRange);
  const energyAxisLabels = buildTimeAxisLabels(energyRange, localeKey);
  const downtimeUnitLabel = getDowntimeUnitLabel(downtimeRange, localeKey);
  const energyUnitLabel = energyRangeConfig.energyUnit;

  // OEE chart: ưu tiên analytics API → fallback về machines (SSE-patched)
  const oeeChartData = oeeAnalytics.byMachine.length > 0
    ? oeeAnalytics.byMachine.map((m) => ({
        label: String(m.machineCode || m.machineName || m.label || m.key || m.id || ''),
        value: Number(m.oee ?? m.value ?? 0),
      }))
    : displayMachines.map((m) => ({ label: m.code, value: m.oee }));
  const hasOeeChartData = oeeChartData.length > 0;

  // Power pie: ưu tiên analytics API → fallback về machines (SSE-patched)
  const powerPieData = energyAnalytics.byMachine.length > 0
    ? energyAnalytics.byMachine.map((m) => {
        const value = Number(m.value ?? m.total ?? 0);
        const label = String(m.machineCode || m.machineName || m.label || m.key || m.id || '');
        return { value, name: `${label} (${value}${powerRangeConfig.energyUnit})` };
      })
    : displayMachines.map((m) => {
        const rawValue = powerRangeConfig.energyUnit === 'kW' ? m.powerKw : (m.powerKw * powerRangeConfig.totalMinutes) / 60;
        const value = Math.round(rawValue * 10) / 10;
        return { value, name: `${m.code} (${value}${powerRangeConfig.energyUnit})` };
      });
  const hasPowerPieData = powerPieData.length > 0;

  // Energy trend: ưu tiên analytics API → fallback về SSE telemetry series (realtime)
  const energyTrendFromApi = energyAnalytics.trend.length > 0
    ? energyAnalytics.trend.map((p) => Number(p.value ?? p.energyKwh ?? p.powerKw ?? 0))
    : null;

  // Build energy trend from SSE telemetry khi API không có data
  const energyTrendFromSse = useMemo(() => {
    if (energyTrendFromApi) return null; // Không cần, đã có API data
    // Gom tất cả telemetry points, nhóm theo thời gian, tính tổng powerKw
    const windowMs = energyRangeConfig.totalMinutes * 60 * 1000;
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
    // Nhóm theo buckets
    const bucketCount = energyRangeConfig.pointCount;
    const bucketSize = windowMs / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }));
    for (const p of allPoints) {
      const idx = Math.min(bucketCount - 1, Math.floor((p.ts - fromMs) / bucketSize));
      buckets[idx].sum += p.powerKw;
      buckets[idx].count += 1;
    }
    return buckets.map((b) => (b.count > 0 ? Math.round((b.sum / b.count) * 100) / 100 : 0));
  }, [energyTrendFromApi, telemetrySeriesByMachineId, energyRangeConfig.totalMinutes, energyRangeConfig.pointCount]);

  const energyTrendData = energyTrendFromApi ?? energyTrendFromSse;
  const hasEnergyTrendData = energyTrendData != null && energyTrendData.length > 0;

  const recentDowntimeEvents = events.filter((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    return eventTime >= Date.now() - downtimeRangeConfig.totalMinutes * 60 * 1000;
  });

  // OEE by Machine chart
  const oeeByMachineOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: oeeChartData.map((m) => m.label),
      axisLabel: { color: '#8fb3d9', fontSize: 11 },
      axisLine: { lineStyle: { color: '#333' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#8fb3d9', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1a2a3a' } },
    },
    series: [
      {
        name: 'OEE',
        type: 'bar',
        data: oeeChartData.map((m) => ({
          value: m.value,
          itemStyle: { color: m.value >= 85 ? '#22c55e' : m.value >= 60 ? '#facc15' : '#ef4444', borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '50%',
      },
      {
        name: selectedLanguage === 'en' ? 'Target' : 'Mục tiêu',
        type: 'line',
        data: Array.from({ length: oeeChartData.length }).map(() => 85),
        smooth: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#facc15', width: 2 },
      },
    ],
  };

  // Power distribution pie
  const powerPieOption = {
    tooltip: { trigger: 'item', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { color: '#8fb3d9' },
      pageTextStyle: { color: '#8fb3d9' },
      pageIconColor: '#17a2b8',
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0B213F', borderWidth: 2 },
      label: { show: false },
      data: powerPieData,
    }],
  };

  const energyTrendOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '3%', top: '12%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: energyAxisLabels,
      axisLabel: { color: '#8fb3d9' },
      axisLine: { lineStyle: { color: '#333' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9', formatter: `{value} ${energyUnitLabel}` },
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
              { offset: 1, color: 'rgba(23,162,184,0.06)' },
            ],
          },
        },
        data: energyTrendData,
      },
    ],
  };

  const paretoReasonMap = recentDowntimeEvents
    .filter((event) => event.durationMin && event.durationMin > 0)
    .reduce((acc: Record<string, number>, event) => {
      const reason = event.stopReasonCode || event.cause || 'OTHER';
      acc[reason] = (acc[reason] || 0) + normalizeDowntimeMinutes(event.durationMin || 0, downtimeRange);
      return acc;
    }, {});

  const paretoItems = Object.entries(paretoReasonMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const downtimeParetoOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#111', borderColor: '#ef4444', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '3%', top: '12%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: paretoItems.map((item) => item[0]),
      axisLabel: { color: '#8fb3d9', rotate: 18 },
      axisLine: { lineStyle: { color: '#333' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9', formatter: `{value} ${downtimeUnitLabel}` },
      splitLine: { lineStyle: { color: '#1a2a3a' } },
    },
    series: [
      {
        type: 'bar',
        data: paretoItems.map((item) => item[1]),
        itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
        barWidth: '55%',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {(machinesLoading || alarmsLoading || overviewLoading || energyAnalytics.loading || oeeAnalytics.loading || machinesError || alarmsError || overviewError || energyAnalytics.error || oeeAnalytics.error) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {machinesLoading || alarmsLoading || overviewLoading || energyAnalytics.loading || oeeAnalytics.loading
            ? (selectedLanguage === 'en' ? 'Loading dashboard data from backend...' : 'Đang tải dữ liệu bảng điều khiển từ backend...')
            : `${selectedLanguage === 'en' ? 'Backend unavailable. Showing no-data state.' : 'Backend tạm thời không phản hồi. Đang hiển thị trạng thái không có dữ liệu.'} ${machinesError || alarmsError || overviewError || energyAnalytics.error || oeeAnalytics.error || ''}`}
        </div>
      )}

      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* OEE Hero */}
        <div className="card-industrial p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-industrial-text-secondary font-medium uppercase tracking-wider">{messages.dashboard.oeAverage}</p>
              {avgOEE != null ? (
                <p className="text-4xl font-bold mt-2" style={{ color: avgOEE >= 85 ? '#22c55e' : avgOEE >= 60 ? '#facc15' : '#ef4444' }}>
                  {Math.round(avgOEE)}<span className="text-lg font-normal">%</span>
                </p>
              ) : (
                <p className="text-4xl font-bold mt-2 text-industrial-text-secondary">--</p>
              )}
              <p className="text-xs text-industrial-text-secondary mt-1">{selectedLanguage === 'en' ? 'Target: 85%' : 'Mục tiêu: 85%'}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-industrial-border/10 flex items-center justify-center">
              <Activity size={24} className="text-industrial-border" />
            </div>
          </div>
        </div>

        {/* Total Power */}
        <div className="card-industrial p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-industrial-text-secondary font-medium uppercase tracking-wider">{messages.dashboard.totalPower}</p>
              {totalPower != null ? (
                <p className="text-4xl font-bold text-industrial-success mt-2">
                  {formatNumber(totalPower, 1)}<span className="text-lg font-normal ml-1">kW</span>
                </p>
              ) : (
                <p className="text-4xl font-bold mt-2 text-industrial-text-secondary">--</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-industrial-success/10 flex items-center justify-center">
              <Power size={24} className="text-industrial-success" />
            </div>
          </div>
        </div>

        {/* Energy Today */}
        <div className="card-industrial p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-industrial-text-secondary font-medium uppercase tracking-wider">{messages.dashboard.totalEnergyToday}</p>
              {totalEnergy != null ? (
                <p className="text-4xl font-bold text-industrial-border mt-2">
                  {formatNumber(totalEnergy, 0)}<span className="text-lg font-normal ml-1">kWh</span>
                </p>
              ) : (
                <p className="text-4xl font-bold mt-2 text-industrial-text-secondary">--</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-industrial-border/10 flex items-center justify-center">
              <Zap size={24} className="text-industrial-border" />
            </div>
          </div>
        </div>

        {/* Production */}
        <div className="card-industrial p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-industrial-text-secondary font-medium uppercase tracking-wider">{messages.dashboard.totalProduction}</p>
              {totalProduction != null ? (
                <>
                  <p className="text-4xl font-bold text-industrial-text mt-2">
                    {totalProduction}
                  </p>
                  {productionDataValid ? (
                    <p className="text-xs mt-1">
                      <span className="text-industrial-success">{totalGood} {(messages.dashboard as any).good || 'Good'}</span>
                      <span className="text-industrial-text-secondary mx-1">·</span>
                      <span className="text-industrial-error">{totalNG} {(messages.dashboard as any).ng || 'NG'}</span>
                    </p>
                  ) : totalProduction > 0 ? (
                    <p className="text-xs mt-1 text-industrial-text-secondary">
                      {selectedLanguage === 'vi' ? 'Chưa có phân loại Good/NG' : 'Good/NG breakdown unavailable'}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-4xl font-bold mt-2 text-industrial-text-secondary">--</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-industrial-info/10 flex items-center justify-center">
              <CheckCircle size={24} className="text-industrial-info" />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Status + Critical Alerts + Maintenance Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Machines Status */}
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">
            <Activity size={16} />
            {messages.dashboard.machinesStatus}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-industrial-darker/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-industrial-success"></div>
                <span className="text-sm text-industrial-text">{messages.machine.running}</span>
              </div>
              <span className="text-2xl font-bold text-industrial-success">{runningMachines ?? '--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-industrial-darker/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-industrial-error"></div>
                <span className="text-sm text-industrial-text">{messages.machine.fault}</span>
              </div>
              <span className="text-2xl font-bold text-industrial-error">{faultMachines}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-industrial-darker/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-industrial-info"></div>
                <span className="text-sm text-industrial-text">{messages.machine.idle}</span>
              </div>
              <span className="text-2xl font-bold text-industrial-info">{idleMachines}</span>
            </div>
          </div>
          {/* Good/NG Bar */}
          <div className="mt-4 pt-4 border-t border-industrial-border/20">
            <h4 className="text-xs text-industrial-text-secondary mb-2 font-medium">{messages.dashboard.goodNgRatio}</h4>
            {productionDataValid && totalProduction > 0 ? (
              <>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-industrial-card border border-industrial-border/10">
                  <div className="bg-industrial-success rounded-l-full transition-all" style={{ width: `${(totalGood / totalProduction) * 100}%` }}></div>
                  <div className="bg-industrial-error rounded-r-full transition-all" style={{ width: `${(totalNG / totalProduction) * 100}%` }}></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-industrial-success">{((totalGood / totalProduction) * 100).toFixed(1)}% {(messages.dashboard as any).good || 'Good'}</span>
                  <span className="text-industrial-error">{((totalNG / totalProduction) * 100).toFixed(1)}% {(messages.dashboard as any).ng || 'NG'}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-industrial-text-secondary text-center py-2">
                {totalProduction === 0
                  ? (selectedLanguage === 'vi' ? 'Chưa có sản phẩm' : 'No production yet')
                  : (selectedLanguage === 'vi' ? 'Chưa có dữ liệu phân loại Good/NG từ backend' : 'Good/NG classification data unavailable from backend')}
              </div>
            )}
          </div>
        </div>

        {/* Critical Alerts / Alarm Center */}
        <div className="card-industrial p-6">
          <h3 className="panel-title text-industrial-error mb-4">
            <AlertCircle size={16} />
            {messages.dashboard.alarmCenter || (selectedLanguage === 'en' ? 'Alarm Center' : 'Trung Tâm Cảnh Báo')}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-industrial-error/10 border border-industrial-error/30 rounded-lg p-3 text-center">
              <p className="text-3xl font-bold text-industrial-error">{criticalEvents.length}</p>
              <p className="text-xs text-industrial-error mt-1">{selectedLanguage === 'en' ? 'Critical' : 'Nghiêm trọng'}</p>
            </div>
            <div className="bg-industrial-warning/10 border border-industrial-warning/30 rounded-lg p-3 text-center">
              <p className="text-3xl font-bold text-industrial-warning">{warningEvents.length}</p>
              <p className="text-xs text-industrial-warning mt-1">{selectedLanguage === 'en' ? 'Warning' : 'Cảnh báo'}</p>
            </div>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...criticalEvents, ...warningEvents].slice(0, 4).map(event => (
              <Link href="/alarms" key={event.id}>
                <div className={`p-2.5 rounded-lg border-l-4 bg-industrial-darker/50 hover:bg-industrial-card/50 transition-colors ${event.severity === 'critical' ? 'border-l-industrial-error' : 'border-l-industrial-warning'}`}>
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-industrial-text line-clamp-1">
                      {selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}
                    </p>
                    <span className="text-[10px] text-industrial-text-secondary ml-2 shrink-0">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="text-xs text-industrial-text-secondary line-clamp-1 mt-0.5">
                    {machines.find(m => m.id === event.machineId)?.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/alarms" className="block mt-3 text-center text-xs text-industrial-border hover:text-industrial-border-light transition-colors">
            {(messages.dashboard as any).viewAllEvents || (selectedLanguage === 'en' ? 'View all events →' : 'Xem tất cả sự kiện →')}
          </Link>
        </div>

        {/* Maintenance Risk */}
        <div className="card-industrial p-6">
          <h3 className="panel-title text-industrial-warning mb-4">
            <ShieldAlert size={16} />
            {messages.dashboard.maintenanceRisk || (selectedLanguage === 'en' ? 'Maintenance Risk' : 'Rủi Ro Bảo Trì')}
          </h3>
          {riskMachines.length > 0 ? (
            <div className="space-y-3">
              {riskMachines.map(machine => (
                <Link href={`/maintenance`} key={machine.id}>
                  <div className={`p-3 rounded-lg border transition-colors hover:bg-industrial-card/50 ${machine.maintenanceDueDays <= 7 ? 'bg-industrial-error/5 border-industrial-error/30' : 'bg-industrial-warning/5 border-industrial-warning/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-industrial-border/30 shrink-0">
                          <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-industrial-text">{machine.name}</p>
                          <p className="text-xs text-industrial-text-secondary">{machine.code}</p>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${machine.maintenanceDueDays <= 7 ? 'text-industrial-error animate-pulse' : 'text-industrial-warning'}`}>
                        {machine.maintenanceDueDays}{selectedLanguage === 'en' ? 'd' : 'ngày'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-industrial-card overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.max(5, machine.machineHealth)}%`,
                        backgroundColor: machine.machineHealth >= 80 ? '#22c55e' : machine.machineHealth >= 60 ? '#facc15' : '#ef4444'
                      }}></div>
                    </div>
                    <p className="text-xs text-industrial-text-secondary mt-1">{(messages.dashboard as any).health || (selectedLanguage === 'en' ? 'Health' : 'Sức khỏe')}: {machine.machineHealth}%</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-industrial-success/10 border border-industrial-success/30 rounded-lg p-6 text-center">
              <CheckCircle size={32} className="text-industrial-success mx-auto mb-2" />
              <p className="text-sm text-industrial-success font-medium">{(messages.dashboard as any).allMachinesHealthy || (selectedLanguage === 'en' ? 'All machines healthy' : 'Tất cả máy đều ổn định')}</p>
            </div>
          )}
          <Link href="/maintenance" className="block mt-3 text-center text-xs text-industrial-border hover:text-industrial-border-light transition-colors">
            {(messages.dashboard as any).viewMaintenance || (selectedLanguage === 'en' ? 'View maintenance →' : 'Xem bảo trì →')}
          </Link>
        </div>
      </div>

      {/* Third Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OEE by Machine Bar Chart */}
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">
              <BarChart3 size={16} />
              {messages.dashboard.oeeTrend || 'OEE by Machine'}
            </h3>
            <TimeRangeSelector value={oeeRange} onChange={setOeeRange} showLabel={false} />
          </div>
          <div className="h-64">
            {hasOeeChartData ? (
              <ReactECharts option={oeeByMachineOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chua co du lieu OEE theo may' : 'No OEE by-machine data'}
                message={selectedLanguage === 'vi' ? 'Backend chua tra ve du lieu OEE theo may trong khoang nay.' : 'Backend has not returned by-machine OEE for this range.'}
              />
            )}
          </div>
        </div>

        {/* Power Distribution Donut */}
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">
              <Zap size={16} />
              {messages.dashboard.powerDistribution || 'Power Distribution'}
            </h3>
            <TimeRangeSelector value={powerRange} onChange={setPowerRange} showLabel={false} />
          </div>
          <div className="h-64">
            {hasPowerPieData ? (
              <ReactECharts option={powerPieOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chua co du lieu phan bo dien nang' : 'No power distribution data'}
                message={selectedLanguage === 'vi' ? 'Backend chua tra ve du lieu phan bo theo may.' : 'Backend has not returned machine power distribution.'}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">{messages.dashboard.energyTrend || 'Energy Consumption Trend'}</h3>
            <TimeRangeSelector value={energyRange} onChange={setEnergyRange} showLabel={false} />
          </div>
          <div className="h-64">
            {hasEnergyTrendData ? (
              <ReactECharts option={energyTrendOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chua co du lieu xu huong nang luong' : 'No energy trend data'}
                message={selectedLanguage === 'vi' ? 'Backend chua tra ve du lieu trend nang luong.' : 'Backend has not returned energy trend points.'}
              />
            )}
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">{messages.dashboard.downtimeCause || 'Downtime Causes (Pareto)'}</h3>
            <TimeRangeSelector value={downtimeRange} onChange={setDowntimeRange} showLabel={false} />
          </div>
          <div className="h-64">
            <ReactECharts option={downtimeParetoOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="card-industrial p-6">
        <h3 className="panel-title mb-4">{(messages.dashboard as any).plantTopology || (selectedLanguage === 'en' ? 'Plant Topology Overview' : 'Tổng quan cấu trúc nhà máy')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {displayMachines.map((machine) => (
            <div key={`topology-${machine.id}`} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-xs text-industrial-text-secondary">{machine.area}</p>
              <p className="text-sm font-semibold text-industrial-text mt-1">{machine.code}</p>
              <p className="text-[11px] text-industrial-text-secondary mt-1">{machine.category}</p>
              {!appEnv.useMock && machine.connectionState && (
                <div className="mt-1.5">
                  <ConnectionBadge connectionState={machine.connectionState} lang={selectedLanguage === 'en' ? 'en' : 'vi'} size="xs" />
                </div>
              )}
              <div className="mt-2 h-1.5 rounded-full bg-industrial-card overflow-hidden">
                <div className={`h-full ${machine.status === 'RUN' ? 'bg-industrial-success' : machine.status === 'FAULT' ? 'bg-industrial-error' : 'bg-industrial-info'}`} style={{ width: `${Math.max(10, machine.machineHealth)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Machines Overview - Card Grid */}
      <div className="card-industrial p-6">
        <h3 className="panel-title mb-4">
          <Settings size={16} />
          {messages.dashboard.machinesList}
        </h3>
        {filteredMachines.length === 0 && (
          <p className="text-xs text-industrial-warning mb-4">
            {messages.dashboard.noMachineMatchFilter}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayMachines.map((machine) => (
            <Link href={`/machines?id=${machine.id}`} key={machine.id}>
              <div className="p-4 bg-industrial-darker/50 rounded-lg border border-industrial-border/20 hover:border-industrial-border/50 transition-all cursor-pointer hover:bg-industrial-dark/50 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-industrial-border/30 shrink-0">
                    <img src={machine.image} alt={machine.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                        backgroundColor: !machineIsLive(machine.id) && !appEnv.useMock ? '#ef4444' : machine.status === 'RUN' ? '#22c55e' : machine.status === 'FAULT' ? '#ef4444' : '#60a5fa'
                      }}></div>
                      <p className="font-semibold text-industrial-text truncate group-hover:text-industrial-border transition-colors">{machine.name}</p>
                    </div>
                    <p className="text-xs text-industrial-text-secondary">{machine.code} · {!machineIsLive(machine.id) && !appEnv.useMock ? (selectedLanguage === 'vi' ? 'Mất kết nối' : 'Offline') : machine.status}</p>
                    <div className="flex gap-1 mt-1 flex-wrap items-center">
                      <span className="data-layer-badge raw">{selectedLanguage === 'en' ? 'thô' : 'thô'}</span>
                      <span className="data-layer-badge computed">{selectedLanguage === 'en' ? 'chỉ số' : 'chỉ số'}</span>
                      <span className="data-layer-badge predicted">{selectedLanguage === 'en' ? 'dự báo' : 'dự báo'}</span>
                      {!appEnv.useMock && (
                        <ConnectionBadge
                          connectionState={machine.connectionState}
                          lang={selectedLanguage === 'en' ? 'en' : 'vi'}
                          size="xs"
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold" style={{ color: machineIsLive(machine.id) ? (machine.oee >= 85 ? '#22c55e' : machine.oee >= 60 ? '#facc15' : '#ef4444') : '#6b7280' }}>{fmtDash(machine.id, machine.oee, 0)}%</p>
                    <p className="text-[10px] text-industrial-text-secondary">OEE</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).powerShort || (selectedLanguage === 'en' ? 'Power' : 'Điện')}</p>
                    <p className="font-semibold text-industrial-text">{fmtDash(machine.id, machine.powerKw)}<span className="text-industrial-text-secondary text-[10px]"> kW</span></p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).partsShort || (selectedLanguage === 'en' ? 'Parts' : 'Sản lượng')}</p>
                    <p className="font-semibold text-industrial-text">{machineIsLive(machine.id) || appEnv.useMock ? machine.partCount : '--'}</p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).healthShort || (selectedLanguage === 'en' ? 'Health' : 'Sức khỏe')}</p>
                    <p className="font-semibold" style={{ color: machineIsLive(machine.id) ? (machine.machineHealth >= 80 ? '#22c55e' : machine.machineHealth >= 60 ? '#facc15' : '#ef4444') : '#6b7280' }}>{fmtDash(machine.id, machine.machineHealth, 0)}%</p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).alarmsShort || (selectedLanguage === 'en' ? 'Alarms' : 'Cảnh báo')}</p>
                    <p className={`font-semibold ${machine.activeAlarms > 0 ? 'text-industrial-error' : 'text-industrial-success'}`}>{machine.activeAlarms}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

