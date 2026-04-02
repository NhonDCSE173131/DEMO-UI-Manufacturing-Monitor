'use client';

import { useMachineStore } from '@/lib/store';
import { useRealtimeStore } from '@/lib/realtime-store';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useAlarmsData } from '@/hooks/useAlarmsData';
import { formatDateTime, getSeverityBgColor, getSeverityBorderColor } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, Wifi, WifiOff, Radio } from 'lucide-react';
import { StockChart } from '@/components/StockChart';
import { useMemo, useState } from 'react';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { getDowntimeUnitLabel, getTimeAxisLabel, getTimeRangeConfig, getXAxisFormatter, normalizeDowntimeMinutes } from '@/lib/time-range-config';
import { buildStockLineChart, chartColors, stockBarSeries, stockGrid, stockTooltip, stockYAxis } from '@/lib/chart-config';

const AlarmPage = () => {
  const { selectedLanguage } = useMachineStore();
  const { connectionStatus, realtimeAlarmEvents, lastMessageAt } = useRealtimeStore();
  const { machines, loading: machinesLoading, error: machinesError } = useMachinesData();
  const { events, loading: alarmsLoading, error: alarmsError, acknowledge } = useAlarmsData();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [machineFilter, setMachineFilter] = useState<'all' | string>('all');
  const [timeRange, setTimeRange] = useState<'all' | '1h' | '8h' | '24h'>('24h');
  const [timelineRange, setTimelineRange] = useState<TimeRange>('1h');
  const [paretoRange, setParetoRange] = useState<TimeRange>('1h');

  const isRealtimeLive = connectionStatus === 'live';
  const realtimeEventCount = realtimeAlarmEvents.length;

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      const matchSeverity = severityFilter === 'all' || event.severity === severityFilter;
      const matchMachine = machineFilter === 'all' || event.machineId === machineFilter;
      const eventTime = new Date(event.timestamp).getTime();
      const matchTime =
        timeRange === 'all'
          ? true
          : timeRange === '1h'
          ? now - eventTime <= 3600000
          : timeRange === '8h'
          ? now - eventTime <= 8 * 3600000
          : now - eventTime <= 24 * 3600000;
      return matchSeverity && matchMachine && matchTime;
    });
  }, [events, machineFilter, severityFilter, timeRange]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle size={18} className="text-industrial-error shrink-0" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-industrial-warning shrink-0" />;
      default:
        return <Info size={18} className="text-industrial-info shrink-0" />;
    }
  };

  const groupedEvents = filteredEvents.reduce((acc: any, event) => {
    const machine = machines.find((m) => m.id === event.machineId);
    const machineKey = machine?.name || (selectedLanguage === 'en' ? 'Unknown' : 'Không rõ');
    if (!acc[machineKey]) {
      acc[machineKey] = [];
    }
    acc[machineKey].push(event);
    return acc;
  }, {});

  const downtimeEvents = filteredEvents.filter((event) => event.durationMin && event.durationMin > 0);
  const totalDowntime = downtimeEvents.reduce((sum, event) => sum + (event.durationMin || 0), 0);
  const mttr = downtimeEvents.length > 0 ? totalDowntime / downtimeEvents.length : 0;
  const mtbf = downtimeEvents.length > 0 ? (24 * 60) / downtimeEvents.length : 24 * 60;

  const timelineConfig = getTimeRangeConfig(timelineRange);
  const paretoConfig = getTimeRangeConfig(paretoRange);
  const timelineXAxisFormatter = useMemo(() => getXAxisFormatter(timelineRange), [timelineRange]);
  const timelineXAxisName = useMemo(
    () => getTimeAxisLabel(timelineRange, selectedLanguage === 'en' ? 'en' : 'vi'),
    [timelineRange, selectedLanguage],
  );
  const timelineUnitLabel = getDowntimeUnitLabel(timelineRange, selectedLanguage === 'en' ? 'en' : 'vi');
  const paretoUnitLabel = getDowntimeUnitLabel(paretoRange, selectedLanguage === 'en' ? 'en' : 'vi');
  const scopedTimelineEvents = downtimeEvents
    .filter((event) => new Date(event.timestamp).getTime() >= Date.now() - timelineConfig.totalMinutes * 60 * 1000)
    .slice(0, 10);
  const scopedParetoEvents = downtimeEvents.filter(
    (event) => new Date(event.timestamp).getTime() >= Date.now() - paretoConfig.totalMinutes * 60 * 1000,
  );

  const reasonMap = scopedParetoEvents.reduce((acc: Record<string, number>, event) => {
    const reason = event.stopReasonCode || event.cause || 'OTHER';
    acc[reason] = (acc[reason] || 0) + normalizeDowntimeMinutes(event.durationMin || 0, paretoRange);
    return acc;
  }, {});

  const paretoData = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const paretoOption = {
    tooltip: stockTooltip(chartColors.danger),
    grid: stockGrid({ top: '8%', bottom: '10%' }),
    xAxis: {
      type: 'category' as const,
      data: paretoData.map((item) => item[0]),
      axisLabel: { color: chartColors.axisLabel, rotate: 18 },
      axisLine: { lineStyle: { color: chartColors.axisLine } },
      axisTick: { show: false },
    },
    yAxis: stockYAxis({ unit: paretoUnitLabel }),
    series: [
      stockBarSeries(
        selectedLanguage === 'en' ? 'Downtime' : 'Thời gian dừng',
        paretoData.map((item) => item[1]),
        chartColors.danger,
        { gradient: true },
      ),
    ],
  };

  const timelineOption = buildStockLineChart({
    xAxisData: scopedTimelineEvents.map((event) => timelineXAxisFormatter(event.timestamp)),
    series: [
      {
        name: selectedLanguage === 'en' ? 'Downtime timeline' : 'Dòng thời gian dừng máy',
        data: scopedTimelineEvents.map((event) => normalizeDowntimeMinutes(event.durationMin || 0, timelineRange)),
        color: chartColors.primary,
        showArea: true,
      },
    ],
    yAxisUnit: timelineUnitLabel,
    xAxisName: timelineXAxisName,
  });

  const criticalPending = filteredEvents
    .filter((event) => event.severity === 'critical' && event.acknowledged === false)
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Loading / Error banner */}
      {(machinesLoading || alarmsLoading || machinesError || alarmsError) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {machinesLoading || alarmsLoading
            ? (selectedLanguage === 'en' ? 'Loading alarms from backend...' : 'Đang tải cảnh báo từ backend...')
            : `${selectedLanguage === 'en' ? 'Backend unavailable. Showing local fallback.' : 'Backend tạm thời không phản hồi. Đang hiển thị dữ liệu dự phòng.'} ${machinesError || alarmsError || ''}`}
        </div>
      )}

      {/* Realtime connection status for alarms */}
      <div className={`card-industrial p-3 flex items-center justify-between border ${
        isRealtimeLive
          ? 'border-industrial-success/30 bg-industrial-success/5'
          : connectionStatus === 'connecting' || connectionStatus === 'degraded'
          ? 'border-industrial-warning/30 bg-industrial-warning/5'
          : 'border-industrial-error/30 bg-industrial-error/5'
      }`}>
        <div className="flex items-center gap-2">
          {isRealtimeLive ? (
            <Radio size={14} className="text-industrial-success animate-pulse" />
          ) : connectionStatus === 'connecting' || connectionStatus === 'degraded' ? (
            <Wifi size={14} className="text-industrial-warning" />
          ) : (
            <WifiOff size={14} className="text-industrial-error" />
          )}
          <span className="text-xs font-medium">
            {isRealtimeLive
              ? (selectedLanguage === 'en' ? 'Alarms Live — receiving realtime events' : 'Cảnh báo trực tiếp — đang nhận sự kiện realtime')
              : connectionStatus === 'connecting' || connectionStatus === 'degraded'
              ? (selectedLanguage === 'en' ? 'Reconnecting to alarm stream...' : 'Đang kết nối lại luồng cảnh báo...')
              : (selectedLanguage === 'en' ? 'Alarm stream offline — showing cached data' : 'Luồng cảnh báo mất kết nối — hiển thị dữ liệu đã lưu')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-industrial-text-secondary">
          {realtimeEventCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-industrial-border/20 text-industrial-border text-[10px] font-semibold">
              {realtimeEventCount} {selectedLanguage === 'en' ? 'live events' : 'sự kiện live'}
            </span>
          )}
          {lastMessageAt && (
            <span>{selectedLanguage === 'en' ? 'Last: ' : 'Cuối: '}{new Date(lastMessageAt).toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div className="card-industrial p-4">
        <div className="flex flex-wrap gap-2">
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'critical' | 'warning' | 'info')} className="px-3 py-2 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none">
            <option value="all">{selectedLanguage === 'en' ? 'All severity' : 'Tất cả mức độ'}</option>
            <option value="critical">{selectedLanguage === 'en' ? 'Critical' : 'Nghiêm trọng'}</option>
            <option value="warning">{selectedLanguage === 'en' ? 'Warning' : 'Cảnh báo'}</option>
            <option value="info">{selectedLanguage === 'en' ? 'Info' : 'Thông tin'}</option>
          </select>

          <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none">
            <option value="all">{selectedLanguage === 'en' ? 'All machines' : 'Tất cả máy'}</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>{machine.code}</option>
            ))}
          </select>

          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as 'all' | '1h' | '8h' | '24h')} className="px-3 py-2 rounded-lg bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none">
            <option value="all">{selectedLanguage === 'en' ? 'All time' : 'Toàn bộ thời gian'}</option>
            <option value="1h">1h</option>
            <option value="8h">8h</option>
            <option value="24h">24h</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2">{selectedLanguage === 'en' ? 'Total Events' : 'Tổng số sự kiện'}</p>
          <div className="flex justify-between items-end">
            <p className="metric-number text-industrial-text">{filteredEvents.length}</p>
            <Info size={24} className="text-industrial-info opacity-80" />
          </div>
        </div>
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2 text-industrial-error">{selectedLanguage === 'en' ? 'Critical Alerts' : 'Cảnh báo nghiêm trọng'}</p>
          <div className="flex justify-between items-end">
            <p className="metric-number text-industrial-error">
              {filteredEvents.filter((e) => e.severity === 'critical').length}
            </p>
             <AlertCircle size={24} className="text-industrial-error opacity-80" />
          </div>
        </div>
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2 text-industrial-warning">{selectedLanguage === 'en' ? 'Warnings' : 'Cảnh báo'} </p>
           <div className="flex justify-between items-end">
            <p className="metric-number text-industrial-warning">
              {filteredEvents.filter((e) => e.severity === 'warning').length}
            </p>
            <AlertTriangle size={24} className="text-industrial-warning opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-industrial p-5">
          <p className="text-xs text-industrial-text-secondary uppercase mb-1">MTBF</p>
          <p className="text-2xl font-bold text-industrial-border">{Math.round(mtbf)}m</p>
        </div>
        <div className="card-industrial p-5">
          <p className="text-xs text-industrial-text-secondary uppercase mb-1">MTTR</p>
          <p className="text-2xl font-bold text-industrial-warning">{mttr.toFixed(1)}m</p>
        </div>
        <div className="card-industrial p-5">
          <p className="text-xs text-industrial-text-secondary uppercase mb-1">{selectedLanguage === 'en' ? 'Total downtime' : 'Tổng thời gian dừng'}</p>
          <p className="text-2xl font-bold text-industrial-error">{totalDowntime}{selectedLanguage === 'en' ? 'm' : 'phút'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{selectedLanguage === 'en' ? 'Downtime Timeline' : 'Dòng thời gian dừng máy'}</h3>
            <TimeRangeSelector value={timelineRange} onChange={setTimelineRange} showLabel={false} />
          </div>
          <div className="h-64">
            <StockChart option={timelineOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{selectedLanguage === 'en' ? 'Pareto Stop Reasons' : 'Pareto nguyên nhân dừng máy'}</h3>
            <TimeRangeSelector value={paretoRange} onChange={setParetoRange} showLabel={false} />
          </div>
          <div className="h-64">
            <StockChart option={paretoOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {criticalPending.length > 0 && (
        <div className="card-industrial p-6 border-industrial-error/50 bg-industrial-error/5">
          <h3 className="panel-title text-industrial-error mb-4">{selectedLanguage === 'en' ? 'Critical Action Panel' : 'Bảng xử lý cảnh báo nghiêm trọng'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criticalPending.map((event) => (
              <div key={`critical-${event.id}`} className="p-3 rounded-lg border border-industrial-error/30 bg-industrial-darker/50">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-semibold text-industrial-text">{selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-industrial-error">{selectedLanguage === 'en' ? 'UNACK' : 'CHƯA XN'}</span>
                    <button
                      onClick={() => acknowledge(event.id)}
                      className="text-[10px] px-2 py-0.5 rounded bg-industrial-error/20 border border-industrial-error/30 text-industrial-error hover:bg-industrial-error/30 transition-colors"
                    >
                      {selectedLanguage === 'en' ? 'ACK' : 'Xác nhận'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-industrial-text-secondary">{machines.find((machine) => machine.id === event.machineId)?.name || event.machineId}</p>
                <p className="text-xs text-industrial-text-secondary mt-1">{event.stopReasonCode || (selectedLanguage === 'vi' && event.cause_vi ? event.cause_vi : event.cause) || 'UNKNOWN'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events by Machine */}
      <div className="space-y-4">
        {Object.keys(groupedEvents).length === 0 && !alarmsLoading && (
          <div className="card-industrial p-8 text-center">
            <Info size={32} className="text-industrial-text-secondary mx-auto mb-3 opacity-50" />
            <p className="text-sm text-industrial-text-secondary">
              {selectedLanguage === 'en'
                ? 'No alarm events found for the selected filters.'
                : 'Không tìm thấy sự kiện cảnh báo cho bộ lọc đã chọn.'}
            </p>
            {!isRealtimeLive && (
              <p className="text-xs text-industrial-warning mt-2">
                {selectedLanguage === 'en'
                  ? 'Realtime stream is not connected — new alarms will not appear until connection is restored.'
                  : 'Luồng realtime chưa kết nối — cảnh báo mới sẽ không hiện cho đến khi kết nối được khôi phục.'}
              </p>
            )}
          </div>
        )}

        {Object.entries(groupedEvents).map(([machineName, machineEvents]: any) => {
          const machine = machines.find((m) => m.name === machineName);
          return (
            <div key={machineName} className="card-industrial p-6">
              <div className="flex items-center gap-3 mb-4 border-b border-industrial-border/20 pb-3">
                {machine && (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-industrial-border/30">
                    <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="text-industrial-border font-semibold text-lg">{machineName}</h3>
                <span className="text-xs text-industrial-text-secondary ml-auto">
                  {machineEvents.length} {selectedLanguage === 'en' ? 'events' : 'sự kiện'}
                </span>
              </div>
              <div className="space-y-3">
                {machineEvents.slice(0, 8).map((event: any) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border ${getSeverityBgColor(event.severity)} ${getSeverityBorderColor(event.severity)} hover:bg-industrial-darker transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(event.severity)}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                          <p className="font-semibold text-industrial-text">{selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}</p>
                          <span className="text-xs font-mono text-industrial-text-secondary whitespace-nowrap bg-industrial-bg px-2 py-1 rounded">
                            {formatDateTime(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-industrial-text-secondary mb-2 leading-relaxed">
                          {selectedLanguage === 'vi' && event.message_vi ? event.message_vi : event.message}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs mt-2">
                          {event.plannedType && (
                            <p className="text-industrial-text-secondary bg-industrial-dark/50 px-2 py-1 rounded border border-industrial-border/10">
                              <strong className="text-industrial-text">{selectedLanguage === 'en' ? 'Type' : 'Loại'}:</strong>{' '}
                              {event.plannedType === 'planned'
                                ? selectedLanguage === 'en'
                                  ? 'Planned'
                                  : 'Có kế hoạch'
                                : selectedLanguage === 'en'
                                ? 'Unplanned'
                                : 'Đột xuất'}
                            </p>
                          )}
                          {event.cause && (
                            <p className="text-industrial-text-secondary bg-industrial-dark/50 px-2 py-1 rounded border border-industrial-border/10">
                              <strong className="text-industrial-text">{selectedLanguage === 'en' ? 'Cause' : 'Nguyên nhân'}:</strong> {selectedLanguage === 'vi' && event.cause_vi ? event.cause_vi : event.cause}
                            </p>
                          )}
                          {event.durationMin && event.durationMin > 0 && (
                            <p className="text-industrial-text-secondary bg-industrial-dark/50 px-2 py-1 rounded border border-industrial-border/10">
                              <strong className="text-industrial-text">{selectedLanguage === 'en' ? 'Duration' : 'Thời gian'}:</strong> {event.durationMin} {selectedLanguage === 'en' ? 'minutes' : 'phút'}
                            </p>
                          )}
                          {event.acknowledged !== undefined && (
                            <p className="text-industrial-text-secondary bg-industrial-dark/50 px-2 py-1 rounded border border-industrial-border/10">
                              <strong className="text-industrial-text">{selectedLanguage === 'en' ? 'Ack' : 'Xác nhận'}:</strong>{' '}
                              {event.acknowledged
                                ? event.acknowledgedBy || (selectedLanguage === 'en' ? 'Yes' : 'Đã XN')
                                : selectedLanguage === 'en'
                                ? 'No'
                                : 'Chưa'}
                            </p>
                          )}
                          {!event.acknowledged && (
                            <button
                              onClick={() => acknowledge(event.id)}
                              className="px-2 py-1 rounded bg-industrial-border/10 border border-industrial-border/20 text-industrial-border hover:bg-industrial-border/20 transition-colors text-xs"
                            >
                              {selectedLanguage === 'en' ? 'Acknowledge' : 'Xác nhận'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlarmPage;






