'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { Activity, Clock, Cpu, RefreshCw } from 'lucide-react';
import { useMachineStore } from '@/lib/store';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useRealtimeStream } from '@/hooks/useRealtimeStream';
import { TimeRangeSelector, type TimeRange } from '@/components/TimeRangeSelector';
import { getTimeRangeConfig } from '@/lib/time-range-config';
import { formatMachineMode, formatMachineType } from '@/lib/machine-presentation';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { machinesApi } from '@/lib/api/machines';
import { mapApiAlarmToUi } from '@/lib/mappers/alarm.mapper';
import { mapRealtimeTelemetryPatch, pruneUndefinedPatch } from '@/lib/mappers/realtime.mapper';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import type { Machine, MachineEvent } from '@/types';

interface TelemetryChartPoint {
  timestamp: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  powerKw: number;
  temperatureC: number;
  vibrationPct: number;
}

const toHistoryQuery = (range: TimeRange) => {
  const config = getTimeRangeConfig(range);
  const intervalMap: Record<TimeRange, 'raw' | '5m' | '1h' | '6h' | '1d'> = {
    '60s': 'raw',
    '1h': '5m',
    '1d': '1h',
    '1w': '6h',
    '1m': '1d',
  };
  return {
    from: new Date(Date.now() - config.totalMinutes * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    interval: intervalMap[range],
    aggregation: (range === '60s' ? 'last' : 'avg') as 'avg' | 'last',
    totalMinutes: config.totalMinutes,
  };
};

const mapMachineToPoint = (machine: Machine, timestamp: string): TelemetryChartPoint => ({
  timestamp,
  oee: Number(machine.oee || 0),
  availability: Number(machine.availability || 0),
  performance: Number(machine.performance || 0),
  quality: Number(machine.quality || 0),
  powerKw: Number(machine.powerKw || 0),
  temperatureC: Number(machine.temperatureC || 0),
  vibrationPct: Number(machine.vibrationPct || 0),
});

const mapHistoryPoint = (raw: Record<string, unknown>, fallbackMachine: Machine): TelemetryChartPoint => ({
  timestamp: String(raw.timestamp || raw.ts || new Date().toISOString()),
  oee: Number(raw.oee ?? fallbackMachine.oee ?? 0),
  availability: Number(raw.availability ?? fallbackMachine.availability ?? 0),
  performance: Number(raw.performance ?? fallbackMachine.performance ?? 0),
  quality: Number(raw.quality ?? fallbackMachine.quality ?? 0),
  powerKw: Number(raw.powerKw ?? fallbackMachine.powerKw ?? 0),
  temperatureC: Number(raw.temperatureC ?? fallbackMachine.temperatureC ?? 0),
  vibrationPct: Number(raw.vibrationPct ?? fallbackMachine.vibrationPct ?? 0),
});

function MachineDetailContent() {
  const searchParams = useSearchParams();
  const machineIdFromQuery = searchParams.get('id');
  const { selectedLanguage } = useMachineStore();
  const { machines, loading: machinesLoading, error: machinesError, applyMachinePatch } = useMachinesData();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const locale = selectedLanguage === 'en' ? 'en' : 'vi';

  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [historyRange, setHistoryRange] = useState<TimeRange>('1h');
  const [metricRange, setMetricRange] = useState<TimeRange>('1h');

  const [detailMachine, setDetailMachine] = useState<Machine | null>(null);
  const [latestMachine, setLatestMachine] = useState<Machine | null>(null);
  const [alarmHistory, setAlarmHistory] = useState<MachineEvent[]>([]);
  const [downtimeHistory, setDowntimeHistory] = useState<Array<Record<string, unknown>>>([]);

  const [historyState, setHistoryState] = useState<TelemetryChartPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [liveState, setLiveState] = useState<TelemetryChartPoint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (machineIdFromQuery) {
      setSelectedMachineId(machineIdFromQuery);
      return;
    }
    if (!selectedMachineId && machines.length > 0) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machineIdFromQuery, machines, selectedMachineId]);

  const selectedMachine = useMemo(() => {
    const listMachine = machines.find((item) => item.id === selectedMachineId) || null;
    return latestMachine || detailMachine || listMachine;
  }, [machines, selectedMachineId, latestMachine, detailMachine]);

  const loadMachineDetail = useCallback(async () => {
    if (!selectedMachineId) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [detail, latest, alarms, downtime] = await Promise.all([
        machinesApi.getMachineDetail(selectedMachineId),
        machinesApi.getMachineLatest(selectedMachineId),
        machinesApi.getMachineAlarms(selectedMachineId, undefined, undefined, 0, 50),
        machinesApi.getMachineDowntimeHistory(selectedMachineId, undefined, undefined, 0, 50),
      ]);
      setDetailMachine(detail);
      setLatestMachine(latest);
      setAlarmHistory(alarms);
      setDowntimeHistory(downtime as Array<Record<string, unknown>>);
      setLiveState(mapMachineToPoint(latest, new Date().toISOString()));
      applyMachinePatch(selectedMachineId, latest);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Khong tai duoc chi tiet may');
      setDetailMachine(null);
      setLatestMachine(null);
      setAlarmHistory([]);
      setDowntimeHistory([]);
      setLiveState(null);
    } finally {
      setDetailLoading(false);
    }
  }, [applyMachinePatch, selectedMachineId]);

  const loadTelemetryHistory = useCallback(async () => {
    if (!selectedMachineId) return;
    const baselineMachine = selectedMachine;
    if (!baselineMachine) return;

    const historyQueryRange = getTimeRangeConfig(historyRange).totalMinutes >= getTimeRangeConfig(metricRange).totalMinutes ? historyRange : metricRange;
    const query = toHistoryQuery(historyQueryRange);

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rawPoints = await machinesApi.getMachineHistory(selectedMachineId, {
        from: query.from,
        to: query.to,
        interval: query.interval,
        aggregation: query.aggregation,
      });
      setHistoryState(rawPoints.map((point) => mapHistoryPoint(point as Record<string, unknown>, baselineMachine)));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Khong tai duoc lich su telemetry');
      setHistoryState([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyRange, metricRange, selectedMachine, selectedMachineId]);

  useEffect(() => {
    void loadMachineDetail();
  }, [loadMachineDetail]);

  useEffect(() => {
    void loadTelemetryHistory();
  }, [loadTelemetryHistory]);

  const shouldAppendToRange = useCallback((timestamp: string, range: TimeRange) => {
    const windowStart = Date.now() - getTimeRangeConfig(range).totalMinutes * 60 * 1000;
    return new Date(timestamp).getTime() >= windowStart;
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: { topic?: string; data?: unknown; machineId?: string; timestamp?: string }) => {
      const payload = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>;
      const resolvedMachineId = event.machineId || (typeof payload.machineId === 'string' ? payload.machineId : undefined);
      if (!resolvedMachineId || resolvedMachineId !== selectedMachineId) return;

      if (event.topic === 'telemetry' || event.topic === 'connection') {
        const patch = pruneUndefinedPatch(mapRealtimeTelemetryPatch(payload));
        if (Object.keys(patch).length > 0) {
          applyMachinePatch(resolvedMachineId, patch as never);
        }

        const pointTimestamp = String(payload.timestamp || payload.ts || event.timestamp || new Date().toISOString());
        const point = {
          timestamp: pointTimestamp,
          oee: Number(payload.oee ?? liveState?.oee ?? selectedMachine?.oee ?? 0),
          availability: Number(payload.availability ?? liveState?.availability ?? selectedMachine?.availability ?? 0),
          performance: Number(payload.performance ?? liveState?.performance ?? selectedMachine?.performance ?? 0),
          quality: Number(payload.quality ?? liveState?.quality ?? selectedMachine?.quality ?? 0),
          powerKw: Number(payload.powerKw ?? liveState?.powerKw ?? selectedMachine?.powerKw ?? 0),
          temperatureC: Number(payload.temperatureC ?? liveState?.temperatureC ?? selectedMachine?.temperatureC ?? 0),
          vibrationPct: Number(payload.vibrationPct ?? liveState?.vibrationPct ?? selectedMachine?.vibrationPct ?? 0),
        } as TelemetryChartPoint;

        setLiveState(point);

        if (shouldAppendToRange(point.timestamp, historyRange) || shouldAppendToRange(point.timestamp, metricRange)) {
          setHistoryState((prev) => {
            const next = [...prev.filter((item) => item.timestamp !== point.timestamp), point];
            const cap = Math.max(getTimeRangeConfig(historyRange).pointCount, getTimeRangeConfig(metricRange).pointCount) * 2;
            return next.slice(-cap);
          });
        }
      }

      if (event.topic === 'alarm' || 'severity' in payload || 'title' in payload) {
        const next = mapApiAlarmToUi({ ...payload, machineId: resolvedMachineId });
        setAlarmHistory((prev) => [next, ...prev.filter((item) => item.id !== next.id)].slice(0, 100));
      }
    },
    [applyMachinePatch, historyRange, liveState, metricRange, selectedMachine, selectedMachineId, shouldAppendToRange],
  );

  const realtime = useRealtimeStream({
    enabled: Boolean(selectedMachineId),
    machineId: selectedMachineId || undefined,
    topics: ['telemetry', 'alarm', 'connection'],
    onEvent: handleRealtimeEvent,
  });

  const historyWindow = useMemo(() => {
    const start = Date.now() - getTimeRangeConfig(historyRange).totalMinutes * 60 * 1000;
    return historyState.filter((item) => new Date(item.timestamp).getTime() >= start);
  }, [historyRange, historyState]);

  const metricWindow = useMemo(() => {
    const start = Date.now() - getTimeRangeConfig(metricRange).totalMinutes * 60 * 1000;
    return historyState.filter((item) => new Date(item.timestamp).getTime() >= start);
  }, [metricRange, historyState]);

  const oeeChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: historyWindow.map((point) => formatDateTime(point.timestamp).split(' ')[1] || ''),
      axisLabel: { color: '#8fb3d9' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#8fb3d9', formatter: '{value}%' },
    },
    series: [
      { name: 'OEE', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#17a2b8' }, data: historyWindow.map((point) => point.oee) },
      { name: selectedLanguage === 'en' ? 'Availability' : 'Kha dung', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#22c55e' }, data: historyWindow.map((point) => point.availability) },
      { name: selectedLanguage === 'en' ? 'Performance' : 'Hieu suat', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#60a5fa' }, data: historyWindow.map((point) => point.performance) },
      { name: selectedLanguage === 'en' ? 'Quality' : 'Chat luong', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#facc15' }, data: historyWindow.map((point) => point.quality) },
    ],
  };

  const metricChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: metricWindow.map((point) => formatDateTime(point.timestamp).split(' ')[1] || ''),
      axisLabel: { color: '#8fb3d9' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9' },
    },
    series: [
      { name: selectedLanguage === 'en' ? 'Power' : 'Cong suat', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#17a2b8' }, data: metricWindow.map((point) => point.powerKw) },
      { name: selectedLanguage === 'en' ? 'Temperature' : 'Nhiet do', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#ef4444' }, data: metricWindow.map((point) => point.temperatureC) },
      { name: selectedLanguage === 'en' ? 'Vibration' : 'Do rung', type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#facc15' }, data: metricWindow.map((point) => point.vibrationPct) },
    ],
  };

  const goToLive = useCallback(() => {
    setHistoryRange('1h');
    setMetricRange('1h');
    void loadTelemetryHistory();
  }, [loadTelemetryHistory]);

  if (!selectedMachine) {
    return (
      <div className="card-industrial p-6 text-sm text-industrial-text-secondary">
        {machinesLoading
          ? selectedLanguage === 'en'
            ? 'Loading machine detail...'
            : 'Dang tai chi tiet may...'
          : selectedLanguage === 'en'
          ? 'No machine data available.'
          : 'Khong co du lieu may de hien thi.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {(machinesError || detailError || historyError) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {selectedLanguage === 'en'
            ? `Backend unavailable. ${machinesError || detailError || historyError || ''}`
            : `Backend tam thoi khong phan hoi. ${machinesError || detailError || historyError || ''}`}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {machines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => setSelectedMachineId(machine.id)}
            className={`p-4 rounded-lg border-2 text-left ${selectedMachine.id === machine.id ? 'bg-industrial-border/20 border-industrial-border text-industrial-border' : 'bg-industrial-card border-industrial-border/20 hover:border-industrial-border/50'}`}
          >
            <p className="font-semibold text-sm">{machine.code}</p>
            <p className="text-xs text-industrial-text-secondary line-clamp-1">{machine.name}</p>
          </button>
        ))}
      </div>

      <div className="card-industrial p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-industrial-text">{selectedMachine.name}</h2>
            <p className="text-xs text-industrial-text-secondary uppercase">{selectedMachine.code}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 rounded-full text-xs bg-industrial-card/70 border border-industrial-border/20">{formatMachineType(selectedMachine.type, locale)}</span>
            <span className="px-2 py-1 rounded-full text-xs bg-industrial-card/70 border border-industrial-border/20">{formatMachineMode(selectedMachine.mode, locale)}</span>
            <span className={`px-2 py-1 rounded-full text-xs border ${realtime.status === 'live' ? 'bg-industrial-success/10 text-industrial-success border-industrial-success/30' : 'bg-industrial-card/70 text-industrial-text-secondary border-industrial-border/20'}`}>
              {selectedLanguage === 'en' ? `Realtime: ${realtime.status}` : `Realtime: ${realtime.status}`}
            </span>
            <button onClick={goToLive} className="px-2 py-1 rounded-lg text-xs border border-industrial-border/30 bg-industrial-card/50 hover:border-industrial-border/60">
              <RefreshCw size={12} className="inline-block mr-1" /> {selectedLanguage === 'en' ? 'Go to live' : 'Ve live'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">OEE</p><p className="text-lg font-bold text-industrial-border">{formatNumber(liveState?.oee ?? selectedMachine.oee, 1)}%</p></div>
          <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Power' : 'Cong suat'}</p><p className="text-lg font-bold text-industrial-success">{formatNumber(liveState?.powerKw ?? selectedMachine.powerKw, 1)} kW</p></div>
          <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Temperature' : 'Nhiet do'}</p><p className="text-lg font-bold text-industrial-warning">{formatNumber(liveState?.temperatureC ?? selectedMachine.temperatureC ?? 0, 1)} C</p></div>
          <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3"><p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Vibration' : 'Do rung'}</p><p className="text-lg font-bold text-industrial-info">{formatNumber(liveState?.vibrationPct ?? selectedMachine.vibrationPct ?? 0, 1)}%</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Activity size={16} /> {(messages.machineDetail as any).realtimeOeeAnalytics || 'Phan tich OEE thoi gian thuc'}</h3>
            <TimeRangeSelector value={historyRange} onChange={setHistoryRange} showLabel={false} />
          </div>
          <div className="h-72"><ReactECharts option={oeeChartOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title"><Cpu size={16} /> {(messages.machineDetail as any).parameterMonitoring || 'Giam sat thong so'}</h3>
            <TimeRangeSelector value={metricRange} onChange={setMetricRange} showLabel={false} />
          </div>
          <div className="h-72"><ReactECharts option={metricChartOption} style={{ height: '100%', width: '100%' }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4"><Clock size={16} /> {(messages.machineDetail as any).alarmLog || 'Nhat ky canh bao'}</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {alarmHistory.map((event) => (
              <div key={event.id} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-industrial-text-secondary">
                  <span>{event.severity.toUpperCase()}</span>
                  <span>{formatDateTime(event.timestamp)}</span>
                </div>
                <p className="text-sm font-semibold text-industrial-text mt-1">{selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}</p>
                <p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'vi' && event.message_vi ? event.message_vi : event.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">{selectedLanguage === 'en' ? 'Downtime history' : 'Lich su dung may'}</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {downtimeHistory.map((row, index) => (
              <div key={`${String(row.id || index)}-${index}`} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
                <div className="flex justify-between text-xs text-industrial-text-secondary">
                  <span>{String(row.reasonCode || row.reasonGroup || 'OTHER')}</span>
                  <span>{Number(row.durationMin || 0)}m</span>
                </div>
                <p className="text-xs text-industrial-text-secondary mt-1">{String(row.startedAt || row.endedAt || '')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(detailLoading || historyLoading) && (
        <div className="text-xs text-industrial-text-secondary text-right">
          {selectedLanguage === 'en' ? 'Syncing backend data...' : 'Dang dong bo du lieu backend...'}
        </div>
      )}
    </div>
  );
}

const MachinesPage = () => {
  return (
    <Suspense
      fallback={
        <div className="card-industrial p-6 text-sm text-industrial-text-secondary">Dang tai trang may...</div>
      }
    >
      <MachineDetailContent />
    </Suspense>
  );
};

export default MachinesPage;

