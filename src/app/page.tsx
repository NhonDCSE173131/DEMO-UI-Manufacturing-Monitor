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
import { useRealtimeStore } from '@/lib/realtime-store';
import {
  buildRealtimeLiveChart,
  buildOeeByMachineChart,
  buildPowerDonutChart,
  buildStockLineChart,
  chartColors,
  stockTooltip,
  stockGrid,
  stockXAxis,
  stockYAxis,
  stockBarSeries,
} from '@/lib/chart-config';

const toAnalyticsQuery = (range: TimeRange) => {
  const rangeConfig = getTimeRangeConfig(range);
  return {
    from: new Date(Date.now() - rangeConfig.totalMinutes * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    interval: range === '60s' ? 'raw' : range === '1h' ? '5m' : range === '1d' ? '1h' : range === '1w' ? '6h' : '1d',
    aggregation: 'avg',
  } as const;
};

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const getTrendPointValue = (point: Record<string, unknown>): number | null => {
  const metrics = point.metrics && typeof point.metrics === 'object' ? (point.metrics as Record<string, unknown>) : null;
  return (
    toSafeNumber(point.value) ??
    toSafeNumber(point.energyKwh) ??
    toSafeNumber(point.totalEnergyKwh) ??
    toSafeNumber(point.powerKw) ??
    toSafeNumber(point.totalPowerKw) ??
    toSafeNumber(metrics?.totalEnergyKwh) ??
    toSafeNumber(metrics?.energyKwh) ??
    toSafeNumber(metrics?.totalPowerKw) ??
    toSafeNumber(metrics?.powerKw)
  );
};

const getTrendPointLabel = (point: Record<string, unknown>): string => {
  const raw = point.label ?? point.timestamp ?? point.ts ?? point.bucketEnd;
  return typeof raw === 'string' && raw.trim() !== '' ? raw : '';
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
  const machineIsLive = (machineId: string) => isMachineLive(machineId);
  /** §5.2: fmtDash uses actual connectionState for UNSTABLE etc. */
  const fmtDash = (machineId: string, val: number | undefined | null, decimals = 1) => {
    const live = machineIsLive(machineId);
    const conn = machines.find(m => m.id === machineId)?.connectionState;
    return liveMetricValue(val, live ? (conn || 'ONLINE') : 'OFFLINE', (v) => formatNumber(v, decimals));
  };

  const resolveDisplayState = (machine: (typeof machines)[number]) => {
    const display = machine.displayState?.toUpperCase();
    if (display === 'ONLINE' || display === 'STALE' || display === 'OFFLINE' || display === 'UNSTABLE') return display;
    if (display === 'RUNNING' || display === 'IDLE' || display === 'WARMUP' || display === 'STOPPED' || display === 'EMERGENCY_STOP' || display === 'MAINTENANCE') return display;
    if (machine.connectionState && machine.connectionState !== 'ONLINE') return machine.connectionState;
    if (machine.operationalState) return machine.operationalState;
    if (machine.status === 'RUN') return 'RUNNING';
    if (machine.status === 'FAULT') return 'EMERGENCY_STOP';
    if (machine.status === 'STOP') return 'STOPPED';
    if (machine.status === 'MAINT') return 'MAINTENANCE';
    return 'IDLE';
  };

  const statusFromDisplayState = (state: string) => {
    if (state === 'RUNNING') return 'RUN';
    if (state === 'EMERGENCY_STOP') return 'FAULT';
    if (state === 'STOPPED') return 'STOP';
    if (state === 'MAINTENANCE') return 'MAINT';
    return 'IDLE';
  };

  const getMachineDisplayLabel = (machine: (typeof machines)[number]) => {
    const state = resolveDisplayState(machine);
    if (state === 'OFFLINE') return selectedLanguage === 'vi' ? 'Mất kết nối' : 'Offline';
    if (state === 'STALE') return selectedLanguage === 'vi' ? 'Dữ liệu cũ' : 'Stale';
    if (state === 'UNSTABLE') return selectedLanguage === 'vi' ? 'Không ổn định' : 'Unstable';
    return statusFromDisplayState(state);
  };

  const filteredMachines = machines.filter((machine) => {
    const matchArea = selectedAreaFilter === 'all' || machine.area === selectedAreaFilter;
    const matchStatus = selectedStatusFilter === 'all' || machine.status === selectedStatusFilter;
    return matchArea && matchStatus;
  });

  const displayMachines = filteredMachines.length > 0 ? filteredMachines : machines;

  // ─── KPIs ───────────────────────────────────────────────────
  // §5.10: Chỉ tính từ machines có dữ liệu thật, không dùng ?? 0 để trộn
  const livePowerMachines = displayMachines.filter(m => m.powerKw != null);
  const totalPower = overview?.plantPowerKw
    ?? (livePowerMachines.length > 0 ? livePowerMachines.reduce((sum, m) => sum + m.powerKw!, 0) : undefined);
  const liveEnergyMachines = displayMachines.filter(m => m.energyTodayKwh != null);
  const totalEnergy = overview?.todayEnergyKwh
    ?? (liveEnergyMachines.length > 0 ? liveEnergyMachines.reduce((sum, m) => sum + m.energyTodayKwh!, 0) : undefined);
  const oeeValidMachines = displayMachines.filter(m => m.oee != null);
  const avgOEE = overview?.todayOee ?? oeeAnalytics.overview?.oee ?? oeeAnalytics.overview?.avgOee
    ?? (oeeValidMachines.length > 0
      ? oeeValidMachines.reduce((sum, m) => sum + m.oee!, 0) / oeeValidMachines.length
      : undefined);

  const totalProduction = oeeAnalytics.overview?.totalOutput
    ?? (() => {
      const ms = displayMachines.filter(m => m.partCount != null);
      return ms.length > 0 ? ms.reduce((sum, m) => sum + m.partCount!, 0) : undefined;
    })();
  const totalGood = oeeAnalytics.overview?.goodOutput
    ?? (() => {
      const ms = displayMachines.filter(m => m.goodCount != null);
      return ms.length > 0 ? ms.reduce((sum, m) => sum + m.goodCount!, 0) : undefined;
    })();
  const totalNG = oeeAnalytics.overview?.rejectOutput
    ?? (() => {
      const ms = displayMachines.filter(m => m.ngCount != null);
      return ms.length > 0 ? ms.reduce((sum, m) => sum + m.ngCount!, 0) : undefined;
    })();

  const productionDataValid =
    totalProduction != null && totalGood != null && totalNG != null
    && totalProduction >= 0 && totalGood >= 0 && totalNG >= 0
    && (totalGood > 0 || totalNG > 0)
    && totalGood + totalNG <= totalProduction + 1;

  const runningMachines = overview?.runningMachines
    ?? displayMachines.filter((m) => statusFromDisplayState(resolveDisplayState(m)) === 'RUN').length;
  const faultMachines = displayMachines.filter((m) => statusFromDisplayState(resolveDisplayState(m)) === 'FAULT').length;
  const idleMachines = displayMachines.filter((m) => statusFromDisplayState(resolveDisplayState(m)) === 'IDLE').length;
  const criticalEvents = events.filter(e => e.severity === 'critical');
  const warningEvents = events.filter(e => e.severity === 'warning');
  const riskMachines = displayMachines
    .filter((m) => (m.maintenanceDueDays ?? Number.POSITIVE_INFINITY) <= 14)
    .sort((a, b) => (a.maintenanceDueDays ?? Number.POSITIVE_INFINITY) - (b.maintenanceDueDays ?? Number.POSITIVE_INFINITY));

  // ─── Chart data ─────────────────────────────────────────────
  const energyRangeConfig = getTimeRangeConfig(energyRange);
  const powerRangeConfig = getTimeRangeConfig(powerRange);
  const downtimeRangeConfig = getTimeRangeConfig(downtimeRange);
  const energyAxisLabels = buildTimeAxisLabels(energyRange, localeKey);
  const downtimeUnitLabel = getDowntimeUnitLabel(downtimeRange, localeKey);
  const energyUnitLabel = energyRangeConfig.energyUnit;

  // §5.8: Không dùng ?? 0, chart dùng null cho giá trị thiếu
  const oeeChartData = oeeAnalytics.byMachine.length > 0
    ? oeeAnalytics.byMachine.map((m) => ({
        label: String(m.machineCode || m.machineName || m.label || m.key || m.id || ''),
        value: m.oee ?? m.value ?? null,
      }))
    : displayMachines
        .filter((m) => m.oee != null)
        .map((m) => ({ label: m.code, value: m.oee! }));
  const hasOeeChartData = oeeChartData.length > 0 && oeeChartData.some(d => d.value != null && d.value > 0);

  // §5.8: Không dùng ?? 0 cho giá trị thiếu
  const powerPieData = energyAnalytics.byMachine.length > 0
    ? energyAnalytics.byMachine
        .filter((m) => (m.value ?? m.total) != null)
        .map((m) => {
          const value = Number(m.value ?? m.total);
          const label = String(m.machineCode || m.machineName || m.label || m.key || m.id || '');
          return { value, name: label };
        })
    : displayMachines
      .filter((m) => m.powerKw != null)
      .map((m) => {
        const power = m.powerKw!;
        const rawValue = powerRangeConfig.energyUnit === 'kW' ? power : (power * powerRangeConfig.totalMinutes) / 60;
        const value = Math.round(rawValue * 10) / 10;
        return { value, name: m.code };
      });
  const hasPowerPieData = powerPieData.length > 0 && powerPieData.some(d => d.value > 0);

  // §5.8: Dùng null cho giá trị thiếu, không dùng ?? 0
  const energyTrendFromApi = energyAnalytics.trend.length > 0
    ? energyAnalytics.trend.map((p) => getTrendPointValue(p as Record<string, unknown>))
    : null;

  const energyTrendFromSse = useMemo(() => {
    if (energyTrendFromApi) return null;
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
    const bucketCount = energyRangeConfig.pointCount;
    const bucketSize = windowMs / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }));
    for (const p of allPoints) {
      const idx = Math.min(bucketCount - 1, Math.floor((p.ts - fromMs) / bucketSize));
      buckets[idx].sum += p.powerKw;
      buckets[idx].count += 1;
    }
    return buckets.map((b) => (b.count > 0 ? Math.round((b.sum / b.count) * 100) / 100 : null));
  }, [energyTrendFromApi, telemetrySeriesByMachineId, energyRangeConfig.totalMinutes, energyRangeConfig.pointCount]);

  const energyTrendData = energyTrendFromApi ?? energyTrendFromSse;
  const hasEnergyTrendData = energyTrendData != null && energyTrendData.some((value) => value != null);

  const recentDowntimeEvents = events.filter((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    return eventTime >= Date.now() - downtimeRangeConfig.totalMinutes * 60 * 1000;
  });
  const hasDowntimeData = recentDowntimeEvents.some(e => e.durationMin && e.durationMin > 0);

  // ─── §5.6 Live Trend Data (stock-chart style from SSE ring buffer) ───
  const livePowerTrend = useMemo(() => {
    const windowMs = 60 * 1000;
    const fromMs = Date.now() - windowMs;
    const bucketCount = 60;
    const bucketSize = windowMs / bucketCount;
    const buckets: Array<{ ts: number; sum: number; count: number }> = Array.from(
      { length: bucketCount }, (_, i) => ({ ts: fromMs + i * bucketSize, sum: 0, count: 0 }),
    );
    for (const series of Object.values(telemetrySeriesByMachineId)) {
      for (const p of series) {
        const ts = new Date(p.timestamp).getTime();
        if (ts >= fromMs && p.powerKw != null) {
          const idx = Math.min(bucketCount - 1, Math.floor((ts - fromMs) / bucketSize));
          buckets[idx].sum += p.powerKw;
          buckets[idx].count += 1;
        }
      }
    }
    const labels = buckets.map(b => { const d = new Date(b.ts); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`; });
    const values = buckets.map(b => b.count > 0 ? Math.round((b.sum / b.count) * 100) / 100 : null);
    return { labels, values, hasData: values.some(v => v != null) };
  }, [telemetrySeriesByMachineId]);

  const liveOeeTrend = useMemo(() => {
    const windowMs = 60 * 1000;
    const fromMs = Date.now() - windowMs;
    const bucketCount = 60;
    const bucketSize = windowMs / bucketCount;
    const buckets: Array<{ ts: number; sum: number; count: number }> = Array.from(
      { length: bucketCount }, (_, i) => ({ ts: fromMs + i * bucketSize, sum: 0, count: 0 }),
    );
    for (const series of Object.values(telemetrySeriesByMachineId)) {
      for (const p of series) {
        const ts = new Date(p.timestamp).getTime();
        if (ts >= fromMs && p.oee != null) {
          const idx = Math.min(bucketCount - 1, Math.floor((ts - fromMs) / bucketSize));
          buckets[idx].sum += p.oee;
          buckets[idx].count += 1;
        }
      }
    }
    const labels = buckets.map(b => { const d = new Date(b.ts); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`; });
    const values = buckets.map(b => b.count > 0 ? Math.round((b.sum / b.count) * 100) / 100 : null);
    return { labels, values, hasData: values.some(v => v != null) };
  }, [telemetrySeriesByMachineId]);

  // OEE by Machine chart - Stock style
  const oeeByMachineOption = buildOeeByMachineChart({
    machines: oeeChartData.map((m) => m.label),
    oeeValues: oeeChartData.map((m) => m.value),
    targetValue: 85,
    locale: localeKey,
  });

  // Power distribution donut - Stock style
  const powerPieOption = buildPowerDonutChart({
    data: powerPieData,
    unit: powerRangeConfig.energyUnit,
    locale: localeKey,
  });

  // Energy trend chart - Stock style
  const energyTrendOption = buildStockLineChart({
    xAxisData: energyAnalytics.trend.length > 0
      ? energyAnalytics.trend.map((p) => getTrendPointLabel(p as Record<string, unknown>))
      : energyAxisLabels,
    series: [
      {
        name: selectedLanguage === 'vi' ? 'Năng lượng' : 'Energy',
        data: energyTrendData ?? [],
        color: chartColors.primary,
        showArea: true,
      },
    ],
    yAxisUnit: energyUnitLabel,
  });

  const paretoReasonMap = recentDowntimeEvents
    .filter((event) => event.durationMin && event.durationMin > 0)
    .reduce((acc: Record<string, number>, event) => {
      const reason = event.stopReasonCode || event.cause || 'OTHER';
      acc[reason] = (acc[reason] || 0) + normalizeDowntimeMinutes(event.durationMin || 0, downtimeRange);
      return acc;
    }, {});

  const paretoItems = Object.entries(paretoReasonMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Downtime Pareto - Stock style
  const downtimeParetoOption = {
    animation: true,
    animationDuration: 300,
    tooltip: stockTooltip(chartColors.danger),
    grid: stockGrid({ bottom: '15%' }),
    xAxis: {
      type: 'category' as const,
      data: paretoItems.map((item) => item[0]),
      axisLine: { lineStyle: { color: chartColors.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: chartColors.axisLabel, fontSize: 10, rotate: 20 },
    },
    yAxis: stockYAxis({ unit: downtimeUnitLabel }),
    series: [stockBarSeries(
      selectedLanguage === 'vi' ? 'Thời gian dừng' : 'Downtime',
      paretoItems.map((item) => item[1]),
      chartColors.danger,
      { gradient: true }
    )],
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
                  <div className={`p-3 rounded-lg border transition-colors hover:bg-industrial-card/50 ${(machine.maintenanceDueDays ?? Number.POSITIVE_INFINITY) <= 7 ? 'bg-industrial-error/5 border-industrial-error/30' : 'bg-industrial-warning/5 border-industrial-warning/30'}`}>
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
                      <span className={`text-lg font-bold ${(machine.maintenanceDueDays ?? Number.POSITIVE_INFINITY) <= 7 ? 'text-industrial-error animate-pulse' : 'text-industrial-warning'}`}>
                        {machine.maintenanceDueDays ?? '--'}{selectedLanguage === 'en' ? 'd' : 'ngày'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-industrial-card overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.max(5, machine.machineHealth ?? 0)}%`,
                        backgroundColor: (machine.machineHealth ?? 0) >= 80 ? '#22c55e' : (machine.machineHealth ?? 0) >= 60 ? '#facc15' : '#ef4444'
                      }}></div>
                    </div>
                    <p className="text-xs text-industrial-text-secondary mt-1">{(messages.dashboard as any).health || (selectedLanguage === 'en' ? 'Health' : 'Sức khỏe')}: {machine.machineHealth ?? '--'}%</p>
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

      {/* §5.6 Live Trend Row — stock-chart style, SSE ring buffer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Power Trend 60s */}
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">
              <Zap size={16} />
              {selectedLanguage === 'en' ? 'Live Power Trend (60s)' : 'Xu hướng công suất live (60s)'}
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            </h3>
          </div>
          <div className="h-52 min-w-0 overflow-hidden">
            {livePowerTrend.hasData ? (
              <ReactECharts 
                option={buildRealtimeLiveChart({
                  labels: livePowerTrend.labels,
                  values: livePowerTrend.values,
                  color: chartColors.success,
                  yAxisUnit: 'kW',
                })} 
                style={{ height: '100%', width: '100%' }} 
              />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu power live' : 'No live power data'}
                message={selectedLanguage === 'vi' ? 'Đang chờ dữ liệu telemetry từ SSE...' : 'Waiting for SSE telemetry data...'}
              />
            )}
          </div>
        </div>

        {/* Live OEE Trend 60s */}
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">
              <Activity size={16} />
              {selectedLanguage === 'en' ? 'Live OEE Trend (60s)' : 'Xu hướng OEE live (60s)'}
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            </h3>
          </div>
          <div className="h-52 min-w-0 overflow-hidden">
            {liveOeeTrend.hasData ? (
              <ReactECharts 
                option={buildRealtimeLiveChart({
                  labels: liveOeeTrend.labels,
                  values: liveOeeTrend.values,
                  color: chartColors.primary,
                  yAxisUnit: '%',
                  yAxisMin: 0,
                  yAxisMax: 100,
                })} 
                style={{ height: '100%', width: '100%' }} 
              />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu OEE live' : 'No live OEE data'}
                message={selectedLanguage === 'vi' ? 'Đang chờ dữ liệu OEE từ SSE...' : 'Waiting for SSE OEE data...'}
              />
            )}
          </div>
        </div>
      </div>

      {/* Third Row: Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OEE by Machine Bar Chart */}
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">
              <BarChart3 size={16} />
              {messages.dashboard.oeeTrend || 'OEE by Machine'}
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-semibold">
                {selectedLanguage === 'vi' ? 'phân tích' : 'analytics'}
              </span>
            </h3>
            <TimeRangeSelector value={oeeRange} onChange={setOeeRange} showLabel={false} />
          </div>
          <div className="h-64 min-w-0 overflow-hidden">
            {hasOeeChartData ? (
              <ReactECharts option={oeeByMachineOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu OEE theo máy' : 'No OEE by-machine data'}
                message={selectedLanguage === 'vi' ? 'Backend chưa trả về dữ liệu OEE theo máy trong khoảng này.' : 'Backend has not returned by-machine OEE for this range.'}
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
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-semibold">
                {selectedLanguage === 'vi' ? 'phân tích' : 'analytics'}
              </span>
            </h3>
            <TimeRangeSelector value={powerRange} onChange={setPowerRange} showLabel={false} />
          </div>
          <div className="h-64 min-w-0 overflow-hidden">
            {hasPowerPieData ? (
              <ReactECharts option={powerPieOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu phân bổ điện năng' : 'No power distribution data'}
                message={selectedLanguage === 'vi' ? 'Backend chưa trả về dữ liệu phân bổ theo máy.' : 'Backend has not returned machine power distribution.'}
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
          <div className="h-64 min-w-0 overflow-hidden">
            {hasEnergyTrendData ? (
              <ReactECharts option={energyTrendOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu xu hướng năng lượng' : 'No energy trend data'}
                message={selectedLanguage === 'vi' ? 'Backend chưa trả về dữ liệu trend năng lượng.' : 'Backend has not returned energy trend points.'}
              />
            )}
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title">{messages.dashboard.downtimeCause || 'Downtime Causes (Pareto)'}</h3>
            <TimeRangeSelector value={downtimeRange} onChange={setDowntimeRange} showLabel={false} />
          </div>
          <div className="h-64 min-w-0 overflow-hidden">
            {hasDowntimeData ? (
              <ReactECharts option={downtimeParetoOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <ChartNoData
                title={selectedLanguage === 'vi' ? 'Chưa có dữ liệu downtime' : 'No downtime data'}
                message={selectedLanguage === 'vi' ? 'Không có sự kiện dừng máy có thời lượng trong khoảng này.' : 'No stop events with duration found in this range.'}
              />
            )}
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
              {machine.connectionState && (
                <div className="mt-1.5">
                  <ConnectionBadge connectionState={machine.connectionState} lang={selectedLanguage === 'en' ? 'en' : 'vi'} size="xs" />
                </div>
              )}
              <div className="mt-2 h-1.5 rounded-full bg-industrial-card overflow-hidden">
                <div className={`h-full ${statusFromDisplayState(resolveDisplayState(machine)) === 'RUN' ? 'bg-industrial-success' : statusFromDisplayState(resolveDisplayState(machine)) === 'FAULT' ? 'bg-industrial-error' : 'bg-industrial-info'}`} style={{ width: `${Math.max(10, machine.machineHealth ?? 0)}%` }}></div>
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
                        backgroundColor: !machineIsLive(machine.id) ? '#ef4444' : statusFromDisplayState(resolveDisplayState(machine)) === 'RUN' ? '#22c55e' : statusFromDisplayState(resolveDisplayState(machine)) === 'FAULT' ? '#ef4444' : '#60a5fa'
                      }}></div>
                      <p className="font-semibold text-industrial-text truncate group-hover:text-industrial-border transition-colors">{machine.name}</p>
                    </div>
                    <p className="text-xs text-industrial-text-secondary">{machine.code} · {getMachineDisplayLabel(machine)}</p>
                    <div className="flex gap-1 mt-1 flex-wrap items-center">
                      <span className="data-layer-badge raw">{selectedLanguage === 'en' ? 'thô' : 'thô'}</span>
                      <span className="data-layer-badge computed">{selectedLanguage === 'en' ? 'chỉ số' : 'chỉ số'}</span>
                      <span className="data-layer-badge predicted">{selectedLanguage === 'en' ? 'dự báo' : 'dự báo'}</span>
                      <ConnectionBadge
                        connectionState={machine.connectionState}
                        lang={selectedLanguage === 'en' ? 'en' : 'vi'}
                        size="xs"
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold" style={{ color: !machineIsLive(machine.id) || machine.oee == null ? '#6b7280' : machine.oee >= 85 ? '#22c55e' : machine.oee >= 60 ? '#facc15' : '#ef4444' }}>{fmtDash(machine.id, machine.oee, 0)}%</p>
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
                    <p className="font-semibold text-industrial-text">{machineIsLive(machine.id) ? (machine.partCount ?? '--') : '--'}</p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).healthShort || (selectedLanguage === 'en' ? 'Health' : 'Sức khỏe')}</p>
                    <p className="font-semibold" style={{ color: !machineIsLive(machine.id) || machine.machineHealth == null ? '#6b7280' : machine.machineHealth >= 80 ? '#22c55e' : machine.machineHealth >= 60 ? '#facc15' : '#ef4444' }}>{fmtDash(machine.id, machine.machineHealth, 0)}%</p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).alarmsShort || (selectedLanguage === 'en' ? 'Alarms' : 'Cảnh báo')}</p>
                    <p className={`font-semibold ${(machine.activeAlarms ?? 0) > 0 ? 'text-industrial-error' : 'text-industrial-success'}`}>{machine.activeAlarms ?? 0}</p>
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

