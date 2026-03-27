'use client';

import { exportApi } from '@/lib/api/export';
import { useEnergyAnalytics } from '@/hooks/useEnergyAnalytics';
import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Activity, AlertCircle, Power, ShieldAlert, Zap } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { useCallback, useMemo, useState } from 'react';
import { TimeRangeSelector, type TimeRange } from '@/components/TimeRangeSelector';
import { getTimeRangeConfig, normalizeDowntimeMinutes } from '@/lib/time-range-config';
import { mapApiAlarmToUi } from '@/lib/mappers/alarm.mapper';
import { useAlarmsData } from '@/hooks/useAlarmsData';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { useRealtimeStream } from '@/hooks/useRealtimeStream';
import { useOeeAnalytics } from '@/hooks/useOeeAnalytics';
import { useMachinesData } from '@/hooks/useMachinesData';
import { mapRealtimeTelemetryPatch, pruneUndefinedPatch } from '@/lib/mappers/realtime.mapper';

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
  const { machines, loading: machinesLoading, error: machinesError, usingMock: machinesUsingMock, applyMachinePatch } = useMachinesData();
  const { events, loading: alarmsLoading, error: alarmsError, usingMock: alarmsUsingMock, upsertEvent } = useAlarmsData();
  const { overview, loading: overviewLoading, error: overviewError, usingMock: overviewUsingMock } = useDashboardOverview();

  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const [energyRange, setEnergyRange] = useState<TimeRange>('1h');
  const [powerRange, setPowerRange] = useState<TimeRange>('1h');
  const [oeeRange, setOeeRange] = useState<TimeRange>('1h');
  const [downtimeRange, setDowntimeRange] = useState<TimeRange>('1h');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const energyQuery = useMemo(() => toAnalyticsQuery(energyRange), [energyRange]);
  const powerQuery = useMemo(() => toAnalyticsQuery(powerRange), [powerRange]);
  const oeeQuery = useMemo(() => toAnalyticsQuery(oeeRange), [oeeRange]);
  const energyAnalytics = useEnergyAnalytics(energyQuery);
  const powerAnalytics = useEnergyAnalytics(powerQuery);
  const oeeAnalytics = useOeeAnalytics(oeeQuery);

  const handleRealtimeEvent = useCallback(
    (event: { topic?: string; data?: unknown; machineId?: string }) => {
      const payload = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>;
      const machineId = event.machineId || (typeof payload.machineId === 'string' ? payload.machineId : undefined);
      if (!machineId) return;

      if (event.topic === 'telemetry' || event.topic === 'connection') {
        const patch = pruneUndefinedPatch(mapRealtimeTelemetryPatch(payload));
        if (Object.keys(patch).length > 0) {
          applyMachinePatch(machineId, patch as never);
        }
      }
      if (event.topic === 'alarm' || 'severity' in payload || 'title' in payload) {
        upsertEvent(mapApiAlarmToUi({ ...payload, machineId }));
      }
    },
    [applyMachinePatch, upsertEvent],
  );

  const realtime = useRealtimeStream({
    enabled: !machinesUsingMock || !alarmsUsingMock,
    topics: ['telemetry', 'alarm', 'connection'],
    onEvent: handleRealtimeEvent,
  });

  const displayMachines = useMemo(() => {
    const filtered = machines.filter((machine) => {
      const matchArea = selectedAreaFilter === 'all' || machine.area === selectedAreaFilter;
      const matchStatus = selectedStatusFilter === 'all' || machine.status === selectedStatusFilter;
      return matchArea && matchStatus;
    });
    return filtered.length > 0 ? filtered : machines;
  }, [machines, selectedAreaFilter, selectedStatusFilter]);

  const totalPower = Number(overview?.plantPowerKw ?? 0);
  const totalEnergy = Number(overview?.todayEnergyKwh ?? 0);
  const avgOEE = Number(overview?.todayOee ?? 0);
  const runningMachines = Number(overview?.runningMachines ?? 0);
  const criticalAlarms = Number(overview?.criticalAlarms ?? 0);

  const powerItems = (powerAnalytics.byMachine || [])
    .map((item) => ({
      label: String(item.machineCode || item.machineName || item.label || item.key || item.id || ''),
      value: Number(item.value ?? item.total ?? 0),
    }))
    .filter((item) => item.label.length > 0);

  const oeeItems = (oeeAnalytics.byMachine || [])
    .map((item) => ({
      label: String(item.machineCode || item.machineName || item.label || item.key || item.id || ''),
      value: Number(item.oee ?? item.value ?? 0),
    }))
    .filter((item) => item.label.length > 0);

  const downtimeConfig = getTimeRangeConfig(downtimeRange);
  const recentDowntimeEvents = events.filter((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    return eventTime >= Date.now() - downtimeConfig.totalMinutes * 60 * 1000;
  });

  const paretoMap = recentDowntimeEvents
    .filter((event) => (event.durationMin ?? 0) > 0)
    .reduce<Record<string, number>>((acc, event) => {
      const reason = event.stopReasonCode || event.cause || (selectedLanguage === 'en' ? 'Unknown' : 'Không rõ');
      acc[reason] = (acc[reason] || 0) + normalizeDowntimeMinutes(event.durationMin || 0, downtimeRange);
      return acc;
    }, {});
  const paretoItems = Object.entries(paretoMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const handleExport = useCallback(async () => {
    const machineId = displayMachines[0]?.id;
    if (!machineId) return;

    setExporting(true);
    setExportError(null);
    try {
      const nowIso = new Date().toISOString();
      const fromIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const job = await exportApi.createTelemetryExport({
        machineId,
        from: fromIso,
        to: nowIso,
        format: 'csv',
        interval: '5m',
        aggregation: 'avg',
      });
      const jobId = job.jobId || job.id;
      if (!jobId) {
        throw new Error(selectedLanguage === 'en' ? 'Missing export job id from backend.' : 'Không nhận được mã job export từ backend.');
      }
      window.open(exportApi.getExportDownloadUrl(jobId), '_blank', 'noopener,noreferrer');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : selectedLanguage === 'en' ? 'Cannot export data.' : 'Không thể xuất dữ liệu.');
    } finally {
      setExporting(false);
    }
  }, [displayMachines, selectedLanguage]);

  const powerPieOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        label: { color: '#8fb3d9' },
        data: powerItems.map((item) => ({ name: item.label, value: item.value })),
      },
    ],
  };

  const energyTrendOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: (energyAnalytics.trend || []).map((point, index) => String(point.label || point.timestamp || `#${index + 1}`)),
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
        data: (energyAnalytics.trend || []).map((point) => Number(point.value ?? point.energyKwh ?? point.powerKw ?? 0)),
      },
    ],
  };

  const oeeByMachineOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: oeeItems.map((item) => item.label),
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
        data: oeeItems.map((item) => item.value),
      },
    ],
  };

  const paretoOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: paretoItems.map((item) => item[0]),
      axisLabel: { color: '#8fb3d9', rotate: 15 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9' },
    },
    series: [
      {
        type: 'bar',
        data: paretoItems.map((item) => item[1]),
        itemStyle: { color: '#ef4444' },
      },
    ],
  };

  const isBackendBusy = machinesLoading || alarmsLoading || overviewLoading || energyAnalytics.loading || oeeAnalytics.loading;
  const backendError = machinesError || alarmsError || overviewError || energyAnalytics.error || oeeAnalytics.error;

  return (
    <div className="space-y-6">
      {(!(machinesUsingMock && alarmsUsingMock && overviewUsingMock) && (isBackendBusy || backendError)) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {isBackendBusy
            ? selectedLanguage === 'en'
              ? 'Loading dashboard data from backend...'
              : 'Đang tải dữ liệu bảng điều khiển từ backend...'
            : selectedLanguage === 'en'
            ? `Backend unavailable. Showing local fallback. ${backendError || ''}`
            : `Backend tạm thời không phản hồi. Đang hiển thị dữ liệu dự phòng. ${backendError || ''}`}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-industrial p-4"><div className="metric-label">{messages.dashboard.oeAverage}</div><div className="metric-number">{formatNumber(avgOEE, 1)}%</div></div>
        <div className="card-industrial p-4"><div className="metric-label">{messages.dashboard.totalPower}</div><div className="metric-number">{formatNumber(totalPower, 1)} kW</div></div>
        <div className="card-industrial p-4"><div className="metric-label">{messages.dashboard.totalEnergyToday}</div><div className="metric-number">{formatNumber(totalEnergy, 1)} kWh</div></div>
        <div className="card-industrial p-4"><div className="metric-label">{messages.dashboard.machinesStatus}</div><div className="metric-number">{formatNumber(runningMachines, 0)}</div></div>
        <div className="card-industrial p-4"><div className="metric-label">{messages.dashboard.activeAlarms}</div><div className="metric-number">{formatNumber(criticalAlarms, 0)}</div></div>
      </div>

      <div className="card-industrial p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-industrial-text-secondary">
          {selectedLanguage === 'en' ? 'Realtime state:' : 'Trạng thái thời gian thực:'} <span className="text-industrial-text">{realtime.status}</span>
        </div>
        <button onClick={handleExport} disabled={exporting} className="px-3 py-1.5 rounded-lg border border-industrial-border/30 bg-industrial-card/60 text-xs text-industrial-text disabled:opacity-60">
          {exporting ? (selectedLanguage === 'en' ? 'Exporting...' : 'Đang xuất...') : messages.dashboard.exportSnapshot}
        </button>
      </div>
      {exportError && <div className="text-xs text-industrial-warning">{exportError}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Zap size={16} /> {messages.dashboard.energyTrend}</h3>
            <TimeRangeSelector value={energyRange} onChange={setEnergyRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={energyTrendOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Power size={16} /> {messages.dashboard.powerDistribution}</h3>
            <TimeRangeSelector value={powerRange} onChange={setPowerRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={powerPieOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Activity size={16} /> {messages.dashboard.oeeTrend}</h3>
            <TimeRangeSelector value={oeeRange} onChange={setOeeRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={oeeByMachineOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><ShieldAlert size={16} /> {messages.dashboard.downtimeCause}</h3>
            <TimeRangeSelector value={downtimeRange} onChange={setDowntimeRange} showLabel={false} />
          </div>
          <div className="h-64"><ReactECharts option={paretoOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>
      </div>

      <div className="card-industrial p-6">
        <h3 className="panel-title mb-4"><AlertCircle size={16} /> {messages.dashboard.topAlarms}</h3>
        <div className="space-y-2">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3 text-sm">
              <div className="font-medium text-industrial-text">{selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}</div>
              <div className="text-xs text-industrial-text-secondary">{selectedLanguage === 'vi' && event.message_vi ? event.message_vi : event.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

