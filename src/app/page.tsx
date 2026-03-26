'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber, formatDateTime } from '@/lib/utils';
import { Activity, Zap, CheckCircle, AlertTriangle, AlertCircle, Settings, Power, TrendingUp, BarChart3, ShieldAlert } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import Link from 'next/link';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { useState } from 'react';
import { buildTimeAxisLabels, getDowntimeUnitLabel, getTimeRangeConfig, normalizeDowntimeMinutes } from '@/lib/time-range-config';

const Dashboard = () => {
  const { machines, events, selectedLanguage, selectedAreaFilter, selectedStatusFilter } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const [compareMode, setCompareMode] = useState<'shift' | 'day' | 'week'>('day');
  const [oeeRange, setOeeRange] = useState<TimeRange>('1h');
  const [powerRange, setPowerRange] = useState<TimeRange>('1h');
  const [energyRange, setEnergyRange] = useState<TimeRange>('1h');
  const [downtimeRange, setDowntimeRange] = useState<TimeRange>('1h');
  const localeKey = selectedLanguage === 'en' ? 'en' : 'vi';

  const filteredMachines = machines.filter((machine) => {
    const matchArea = selectedAreaFilter === 'all' || machine.area === selectedAreaFilter;
    const matchStatus = selectedStatusFilter === 'all' || machine.status === selectedStatusFilter;
    return matchArea && matchStatus;
  });

  const displayMachines = filteredMachines.length > 0 ? filteredMachines : machines;

  const exportSnapshot = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      compareMode,
      oeeRange,
      powerRange,
      energyRange,
      downtimeRange,
      selectedAreaFilter,
      selectedStatusFilter,
      machines: displayMachines.map((machine) => ({
        id: machine.id,
        code: machine.code,
        status: machine.status,
        powerKw: machine.powerKw,
        oee: machine.oee,
        health: machine.machineHealth,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-snapshot-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate metrics
  const totalPower = displayMachines.reduce((sum, m) => sum + m.powerKw, 0);
  const totalEnergy = displayMachines.reduce((sum, m) => sum + m.energyTodayKwh, 0);
  const totalProduction = displayMachines.reduce((sum, m) => sum + m.partCount, 0);
  const totalGood = displayMachines.reduce((sum, m) => sum + m.goodCount, 0);
  const totalNG = displayMachines.reduce((sum, m) => sum + m.ngCount, 0);
  const avgOEE = Math.round(displayMachines.reduce((sum, m) => sum + m.oee, 0) / displayMachines.length);
  const runningMachines = displayMachines.filter((m) => m.status === 'RUN').length;
  const faultMachines = displayMachines.filter((m) => m.status === 'FAULT').length;
  const idleMachines = displayMachines.filter((m) => m.status === 'IDLE').length;
  const criticalEvents = events.filter(e => e.severity === 'critical');
  const warningEvents = events.filter(e => e.severity === 'warning');
  const riskMachines = displayMachines.filter(m => m.maintenanceDueDays <= 14).sort((a,b) => a.maintenanceDueDays - b.maintenanceDueDays);

  const energyRangeConfig = getTimeRangeConfig(energyRange);
  const powerRangeConfig = getTimeRangeConfig(powerRange);
  const downtimeRangeConfig = getTimeRangeConfig(downtimeRange);
  const energyAxisLabels = buildTimeAxisLabels(energyRange, localeKey);
  const downtimeUnitLabel = getDowntimeUnitLabel(downtimeRange, localeKey);
  const energyUnitLabel = energyRangeConfig.energyUnit;
  const energyBase =
    energyUnitLabel === 'kW'
      ? totalPower
      : (totalPower * (energyRangeConfig.totalMinutes / energyRangeConfig.pointCount)) / 60;

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
      data: displayMachines.map(m => m.code),
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
        data: displayMachines.map(m => ({
          value: m.oee,
          itemStyle: { color: m.oee >= 85 ? '#22c55e' : m.oee >= 60 ? '#facc15' : '#ef4444', borderRadius: [4, 4, 0, 0] }
        })),
        barWidth: '50%',
      },
      {
        name: selectedLanguage === 'en' ? 'Target' : 'Mục tiêu',
        type: 'line',
        data: Array.from({ length: displayMachines.length }).map(() => 85),
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
      data: displayMachines.map((m) => {
        const rawValue = powerRangeConfig.energyUnit === 'kW' ? m.powerKw : (m.powerKw * powerRangeConfig.totalMinutes) / 60;
        const value = Math.round(rawValue * 10) / 10;
        return { value, name: `${m.code} (${value}${powerRangeConfig.energyUnit})` };
      }),
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
        data: Array.from({ length: energyRangeConfig.pointCount }).map((_, idx) =>
          Math.max(1, energyBase * (0.82 + Math.sin(idx / 2.2) * 0.12 + Math.random() * 0.08)),
        ),
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
      <div className="card-industrial p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-text-secondary uppercase tracking-wide">{selectedLanguage === 'en' ? 'Compare mode' : 'Chế độ so sánh'}</span>
              <select value={compareMode} onChange={(e) => setCompareMode(e.target.value as 'shift' | 'day' | 'week')} className="px-2 py-1.5 rounded bg-industrial-card/70 border border-industrial-border/20 text-xs text-industrial-text outline-none">
                <option value="shift">{(messages.dashboard as any).shift || (selectedLanguage === 'en' ? 'Shift' : 'Ca')}</option>
                <option value="day">{(messages.dashboard as any).day || (selectedLanguage === 'en' ? 'Day' : 'Ngày')}</option>
                <option value="week">{(messages.dashboard as any).week || (selectedLanguage === 'en' ? 'Week' : 'Tuần')}</option>
              </select>
            </div>
          </div>
          <button onClick={exportSnapshot} className="px-3 py-1.5 rounded-lg border border-industrial-border/30 bg-industrial-card/60 text-xs text-industrial-text hover:border-industrial-border/60 transition-colors">
            {(messages.dashboard as any).exportSnapshot || (selectedLanguage === 'en' ? 'Export Snapshot' : 'Xuất ảnh chụp')}
          </button>
        </div>
      </div>

      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* OEE Hero */}
        <div className="card-industrial p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-industrial-text-secondary font-medium uppercase tracking-wider">{messages.dashboard.oeAverage}</p>
              <p className="text-4xl font-bold mt-2" style={{ color: avgOEE >= 85 ? '#22c55e' : avgOEE >= 60 ? '#facc15' : '#ef4444' }}>
                {avgOEE}<span className="text-lg font-normal">%</span>
              </p>
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
              <p className="text-4xl font-bold text-industrial-success mt-2">
                {formatNumber(totalPower, 1)}<span className="text-lg font-normal ml-1">kW</span>
              </p>
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
              <p className="text-4xl font-bold text-industrial-border mt-2">
                {formatNumber(totalEnergy, 0)}<span className="text-lg font-normal ml-1">kWh</span>
              </p>
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
              <p className="text-4xl font-bold text-industrial-text mt-2">
                {totalProduction}
              </p>
              <p className="text-xs mt-1">
                <span className="text-industrial-success">{totalGood} {(messages.dashboard as any).good || 'Good'}</span>
                <span className="text-industrial-text-secondary mx-1">·</span>
                <span className="text-industrial-error">{totalNG} {(messages.dashboard as any).ng || 'NG'}</span>
              </p>
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
              <span className="text-2xl font-bold text-industrial-success">{runningMachines}</span>
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
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-industrial-card border border-industrial-border/10">
              <div className="bg-industrial-success rounded-l-full transition-all" style={{ width: `${totalProduction > 0 ? (totalGood / totalProduction) * 100 : 0}%` }}></div>
              <div className="bg-industrial-error rounded-r-full transition-all" style={{ width: `${totalProduction > 0 ? (totalNG / totalProduction) * 100 : 0}%` }}></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-industrial-success">{totalProduction > 0 ? ((totalGood / totalProduction) * 100).toFixed(1) : 0}% {(messages.dashboard as any).good || 'Good'}</span>
              <span className="text-industrial-error">{totalProduction > 0 ? ((totalNG / totalProduction) * 100).toFixed(1) : 0}% {(messages.dashboard as any).ng || 'NG'}</span>
            </div>
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
            <ReactECharts option={oeeByMachineOption} style={{ height: '100%', width: '100%' }} />
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
            <ReactECharts option={powerPieOption} style={{ height: '100%', width: '100%' }} />
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
            <ReactECharts option={energyTrendOption} style={{ height: '100%', width: '100%' }} />
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
                        backgroundColor: machine.status === 'RUN' ? '#22c55e' : machine.status === 'FAULT' ? '#ef4444' : '#60a5fa'
                      }}></div>
                      <p className="font-semibold text-industrial-text truncate group-hover:text-industrial-border transition-colors">{machine.name}</p>
                    </div>
                    <p className="text-xs text-industrial-text-secondary">{machine.code} · {machine.status}</p>
                    <div className="flex gap-1 mt-1">
                      <span className="data-layer-badge raw">{selectedLanguage === 'en' ? 'raw' : 'thô'}</span>
                      <span className="data-layer-badge computed">{selectedLanguage === 'en' ? 'kpi' : 'chỉ số'}</span>
                      <span className="data-layer-badge predicted">{selectedLanguage === 'en' ? 'predict' : 'dự báo'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold" style={{ color: machine.oee >= 85 ? '#22c55e' : machine.oee >= 60 ? '#facc15' : '#ef4444' }}>{machine.oee}%</p>
                    <p className="text-[10px] text-industrial-text-secondary">OEE</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).powerShort || (selectedLanguage === 'en' ? 'Power' : 'Điện')}</p>
                    <p className="font-semibold text-industrial-text">{formatNumber(machine.powerKw, 1)}<span className="text-industrial-text-secondary text-[10px]"> kW</span></p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).partsShort || (selectedLanguage === 'en' ? 'Parts' : 'Sản lượng')}</p>
                    <p className="font-semibold text-industrial-text">{machine.partCount}</p>
                  </div>
                  <div className="bg-industrial-bg/50 rounded p-2 text-center">
                    <p className="text-industrial-text-secondary">{(messages.dashboard as any).healthShort || (selectedLanguage === 'en' ? 'Health' : 'Sức khỏe')}</p>
                    <p className="font-semibold" style={{ color: machine.machineHealth >= 80 ? '#22c55e' : machine.machineHealth >= 60 ? '#facc15' : '#ef4444' }}>{machine.machineHealth}%</p>
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

