'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Activity, Target, CalendarClock, Package, AlertTriangle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { useState } from 'react';
import { buildTimeAxisLabels, getDowntimeUnitLabel, getTimeRangeConfig, normalizeDowntimeMinutes } from '@/lib/time-range-config';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useAlarmsData } from '@/hooks/useAlarmsData';
import { formatStopReasonLabel } from '@/lib/machine-presentation';

const OEEPage = () => {
  const { selectedLanguage, selectedShift, selectedAreaFilter, selectedStatusFilter } = useMachineStore();
  const { machines, loading: machinesLoading, error: machinesError, usingMock: machinesUsingMock } = useMachinesData();
  const { events, loading: alarmsLoading, error: alarmsError, usingMock: alarmsUsingMock } = useAlarmsData();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const locale = selectedLanguage === 'en' ? 'en' : 'vi';
  const [oeeTrendRange, setOeeTrendRange] = useState<TimeRange>('1h');
  const [paretoRange, setParetoRange] = useState<TimeRange>('1h');

  const filteredMachines = machines.filter((machine) => {
    const matchArea = selectedAreaFilter === 'all' || machine.area === selectedAreaFilter;
    const matchStatus = selectedStatusFilter === 'all' || machine.status === selectedStatusFilter;
    return matchArea && matchStatus;
  });
  const displayMachines = filteredMachines.length > 0 ? filteredMachines : machines;

  const shiftLabel =
    selectedShift === 'all'
      ? selectedLanguage === 'en'
        ? 'All shifts'
        : 'Tất cả ca'
      : selectedShift.replace('_', ' ').toUpperCase();
  const localeKey = selectedLanguage === 'en' ? 'en' : 'vi';
  const trendConfig = getTimeRangeConfig(oeeTrendRange);
  const paretoConfig = getTimeRangeConfig(paretoRange);
  const trendAxisLabels = buildTimeAxisLabels(oeeTrendRange, localeKey);
  const paretoUnitLabel = getDowntimeUnitLabel(paretoRange, localeKey);

  const avgOEE = displayMachines.length > 0 ? Math.round(displayMachines.reduce((sum, m) => sum + (m.computedMetrics?.oee ?? m.oee), 0) / displayMachines.length) : 0;
  const avgAvailability = displayMachines.length > 0 ? Math.round(displayMachines.reduce((sum, m) => sum + (m.computedMetrics?.availability ?? m.availability), 0) / displayMachines.length) : 0;
  const avgPerformance = displayMachines.length > 0 ? Math.round(displayMachines.reduce((sum, m) => sum + (m.computedMetrics?.performance ?? m.performance), 0) / displayMachines.length) : 0;
  const avgQuality = displayMachines.length > 0 ? Math.round(displayMachines.reduce((sum, m) => sum + (m.computedMetrics?.quality ?? m.quality), 0) / displayMachines.length) : 0;

  const oeeTarget = 85;
  const oeeDelta = avgOEE - oeeTarget;
  const totalOutput = displayMachines.reduce((sum, machine) => sum + machine.partCount, 0);
  const goodOutput = displayMachines.reduce((sum, machine) => sum + machine.goodCount, 0);
  const rejectOutput = displayMachines.reduce((sum, machine) => sum + machine.ngCount, 0);
  const targetOutput = Math.round(totalOutput * 1.08);

  const oeeTrendData = Array.from({ length: trendConfig.pointCount }).map((_, idx) => {
    const base = avgOEE - 5 + idx * 0.4;
    return Math.max(30, Math.min(98, Math.round(base + (Math.random() * 6 - 3))));
  });

  const oeeTrendOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '3%', top: '10%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: trendAxisLabels,
      axisLabel: { color: '#8fb3d9' },
      axisLine: { lineStyle: { color: '#28445f' } },
    },
    yAxis: {
      type: 'value',
      min: 40,
      max: 100,
      axisLabel: { color: '#8fb3d9', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1a2a3a' } },
    },
    series: [
      {
        name: 'OEE',
        type: 'line',
        data: oeeTrendData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#17a2b8', width: 2 },
        itemStyle: { color: '#17a2b8' },
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
      },
      {
        name: 'Target',
        type: 'line',
        data: Array.from({ length: trendConfig.pointCount }).map(() => oeeTarget),
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#facc15' },
      },
    ],
  };

  const scopedParetoEvents = events.filter((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    return eventTime >= Date.now() - paretoConfig.totalMinutes * 60 * 1000;
  });

  const reasonMap = scopedParetoEvents
    .filter((event) => event.durationMin && event.durationMin > 0)
    .reduce((acc: Record<string, number>, event) => {
      const reason = formatStopReasonLabel(event.stopReasonCode || event.cause || 'OTHER', locale);
      acc[reason] = (acc[reason] || 0) + normalizeDowntimeMinutes(event.durationMin || 0, paretoRange);
      return acc;
    }, {});

  const paretoData = Object.entries(reasonMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const paretoOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#111', borderColor: '#ef4444', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '3%', top: '10%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: paretoData.map((item) => item[0]),
      axisLabel: { color: '#8fb3d9', rotate: 18 },
      axisLine: { lineStyle: { color: '#28445f' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8fb3d9', formatter: `{value} ${paretoUnitLabel}` },
      splitLine: { lineStyle: { color: '#1a2a3a' } },
    },
    series: [
      {
        type: 'bar',
        data: paretoData.map((item) => item[1]),
        itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
        barWidth: '55%',
      },
    ],
  };

  const downtimeTimeline = events
    .filter((event) => event.durationMin && event.durationMin > 0)
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      {(!(machinesUsingMock && alarmsUsingMock) && (machinesLoading || alarmsLoading || machinesError || alarmsError)) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {machinesLoading || alarmsLoading
            ? selectedLanguage === 'en'
              ? 'Loading OEE data from backend...'
              : 'Dang tai du lieu OEE tu backend...'
            : selectedLanguage === 'en'
            ? `Backend unavailable. Showing local fallback. ${machinesError || alarmsError || ''}`
            : `Backend tam thoi khong phan hoi. Dang hien thi du lieu du phong. ${machinesError || alarmsError || ''}`}
        </div>
      )}

      <div className="card-industrial p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-industrial-text-secondary">
            <CalendarClock size={16} className="text-industrial-border" />
            <span>{selectedLanguage === 'en' ? 'Shift context' : 'Ngữ cảnh ca'}: <strong className="text-industrial-text">{shiftLabel}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-industrial-text-secondary">
            <Package size={16} className="text-industrial-info" />
            <span>{selectedLanguage === 'en' ? 'Work order' : 'Lệnh sản xuất'}: <strong className="text-industrial-text">WO-ASM-2026-03</strong></span>
          </div>
        </div>
      </div>

      {/* Overall OEE */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-industrial p-8">
          <div className="flex justify-between items-start mb-4">
            <p className="metric-label">{messages.oee.overallOee}</p>
            <Activity className="text-industrial-border opacity-50" size={24} />
          </div>
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(30, 144, 255, 0.1)"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={avgOEE >= oeeTarget ? "#22c55e" : "#1e90ff"}
                strokeWidth="10"
                strokeDasharray={`${(avgOEE / 100) * 282.7} 282.7`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-5xl font-bold text-industrial-text">{avgOEE}%</p>
              <p className="text-sm text-industrial-text-secondary mt-1">{selectedLanguage === 'en' ? 'Target' : 'Mục tiêu'} {oeeTarget}%</p>
            </div>
          </div>
          <p className="text-center text-sm font-medium bg-industrial-dark/50 py-2 rounded-lg border border-industrial-border/10">
            {avgOEE >= oeeTarget ? 
              <span className="text-industrial-success">✓ {selectedLanguage === 'en' ? 'Target Achieved' : 'Đạt Mục Tiêu'}</span> : 
              <span className="text-industrial-warning">{oeeTarget - avgOEE}% {selectedLanguage === 'en' ? 'below target' : 'dưới mục tiêu'}</span>
            }
          </p>
        </div>

        <div className="card-industrial p-6 flex flex-col justify-center xl:col-span-2">
          <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
            <Activity size={18} />
            {selectedLanguage === 'en' ? 'OEE Components' : 'Thành phần OEE'}
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-industrial-text-secondary">
                  {messages.oee.availability}
                </span>
                <span className="font-bold text-industrial-success">{avgAvailability}%</span>
              </div>
              <div className="h-4 rounded-full bg-industrial-card border border-industrial-border/20 overflow-hidden">
                <div
                  className="h-full bg-industrial-success rounded-full transition-all duration-1000"
                  style={{ width: `${avgAvailability}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-industrial-text-secondary">
                  {messages.oee.performance}
                </span>
                <span className="font-bold text-industrial-info">{avgPerformance}%</span>
              </div>
              <div className="h-4 rounded-full bg-industrial-card border border-industrial-border/20 overflow-hidden">
                <div
                  className="h-full bg-industrial-info rounded-full transition-all duration-1000"
                  style={{ width: `${avgPerformance}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-industrial-text-secondary">
                  {messages.oee.quality}
                </span>
                <span className="font-bold text-industrial-border">{avgQuality}%</span>
              </div>
              <div className="h-4 rounded-full bg-industrial-card border border-industrial-border/20 overflow-hidden">
                <div
                  className="h-full bg-industrial-border rounded-full transition-all duration-1000"
                  style={{ width: `${avgQuality}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">
            <Target size={16} />
            {messages.oee.targetVsActual}
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-industrial-darker/50 border border-industrial-border/20">
              <p className="text-xs text-industrial-text-secondary uppercase">{selectedLanguage === 'en' ? 'Target OEE' : 'OEE mục tiêu'}</p>
              <p className="text-2xl font-bold text-industrial-warning">{oeeTarget}%</p>
            </div>
            <div className="p-3 rounded-lg bg-industrial-darker/50 border border-industrial-border/20">
              <p className="text-xs text-industrial-text-secondary uppercase">{selectedLanguage === 'en' ? 'Actual OEE' : 'OEE thực tế'}</p>
              <p className="text-2xl font-bold text-industrial-border">{avgOEE}%</p>
            </div>
            <div className={`p-3 rounded-lg border ${oeeDelta >= 0 ? 'bg-industrial-success/10 border-industrial-success/30' : 'bg-industrial-error/10 border-industrial-error/30'}`}>
              <p className="text-xs text-industrial-text-secondary uppercase">{selectedLanguage === 'en' ? 'Delta' : 'Chênh lệch'}</p>
              <p className={`text-xl font-bold ${oeeDelta >= 0 ? 'text-industrial-success' : 'text-industrial-error'}`}>{oeeDelta >= 0 ? '+' : ''}{oeeDelta}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{selectedLanguage === 'en' ? 'OEE Trend by Time' : 'Xu hướng OEE theo thời gian'}</h3>
            <TimeRangeSelector value={oeeTrendRange} onChange={setOeeTrendRange} showLabel={false} />
          </div>
          <div className="h-64">
            <ReactECharts option={oeeTrendOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">{selectedLanguage === 'en' ? 'Output Panel' : 'Bảng sản lượng'}</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Actual' : 'Thực tế'}</p>
              <p className="text-xl font-bold text-industrial-text">{formatNumber(totalOutput, 0)}</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Target' : 'Mục tiêu'}</p>
              <p className="text-xl font-bold text-industrial-warning">{formatNumber(targetOutput, 0)}</p>
            </div>
            <div className={`border rounded-lg p-3 ${totalOutput >= targetOutput ? 'bg-industrial-success/10 border-industrial-success/30' : 'bg-industrial-warning/10 border-industrial-warning/30'}`}>
              <p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Achievement' : 'Tỷ lệ đạt'}</p>
              <p className={`text-xl font-bold ${totalOutput >= targetOutput ? 'text-industrial-success' : 'text-industrial-warning'}`}>{targetOutput > 0 ? Math.round((totalOutput / targetOutput) * 100) : 0}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-industrial-success/10 border border-industrial-success/30 rounded-lg p-3">
              <p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Good' : 'Đạt'}</p>
              <p className="text-lg font-bold text-industrial-success">{formatNumber(goodOutput, 0)}</p>
            </div>
            <div className="bg-industrial-error/10 border border-industrial-error/30 rounded-lg p-3">
              <p className="text-xs text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Reject' : 'Lỗi'}</p>
              <p className="text-lg font-bold text-industrial-error">{formatNumber(rejectOutput, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-4">{selectedLanguage === 'en' ? 'Downtime Timeline' : 'Dòng thời gian dừng máy'}</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {downtimeTimeline.length > 0 ? downtimeTimeline.map((event) => (
              <div key={event.id} className={`p-3 rounded-lg border ${event.severity === 'critical' ? 'bg-industrial-error/10 border-industrial-error/30' : 'bg-industrial-warning/10 border-industrial-warning/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-industrial-text">{event.title}</p>
                  <span className="text-xs text-industrial-text-secondary">{event.durationMin}{selectedLanguage === 'en' ? 'm' : 'phút'}</span>
                </div>
                <p className="text-xs text-industrial-text-secondary">{formatStopReasonLabel(event.stopReasonCode || event.cause || 'OTHER', locale)}</p>
              </div>
            )) : (
              <p className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'No downtime events in selected context' : 'Không có sự kiện dừng máy trong ngữ cảnh đã chọn'}</p>
            )}
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">
              <AlertTriangle size={16} />
              {selectedLanguage === 'en' ? 'Pareto OEE Loss' : 'Pareto mất OEE'}
            </h3>
            <TimeRangeSelector value={paretoRange} onChange={setParetoRange} showLabel={false} />
          </div>
          <div className="h-72">
            <ReactECharts option={paretoOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* OEE by Machine */}
      <div className="card-industrial p-6">
        <h3 className="panel-title mb-6">
          <Activity size={18} />
          {messages.oee.byMachine}
        </h3>
        <div className="space-y-5">
          {displayMachines
            .sort((a, b) => b.oee - a.oee)
            .map((machine) => (
              <div key={machine.id} className="bg-industrial-darker/50 p-3 rounded-lg border border-industrial-border/10">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-industrial-border/30">
                      <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-industrial-text">{machine.name}</p>
                      <p className="text-xs text-industrial-text-secondary">{machine.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl" style={{color: machine.oee >= oeeTarget ? '#22c55e' : '#facc15'}}>{machine.oee}%</p>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-industrial-card border border-industrial-border/20 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(machine.oee, 100)}%`,
                      backgroundColor: machine.oee >= oeeTarget ? '#22c55e' : '#facc15',
                    }}
                  ></div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default OEEPage;


