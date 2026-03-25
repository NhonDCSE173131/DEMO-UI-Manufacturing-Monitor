'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMachineStore } from '@/lib/store';
import { formatNumber, formatDateTime } from '@/lib/utils';
import { generateMachineTimeSeries } from '@/lib/mock-data';
import { Settings, Thermometer, Zap, Activity, Clock, Cpu, BarChart3, TrendingUp, Package, AlertTriangle, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

function MachineDetailContent() {
  const searchParams = useSearchParams();
  const machineId = searchParams.get('id');
  const { machines, events, selectedLanguage } = useMachineStore();
  
  const initialMachine = machines.find(m => m.id === machineId) || machines[0];
  const [selectedMachineId, setSelectedMachineId] = useState(initialMachine.id);
  
  useEffect(() => {
    if (machineId) {
      const found = machines.find(m => m.id === machineId);
      if (found) setSelectedMachineId(found.id);
    }
  }, [machineId, machines]);

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || machines[0];
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const machineEvents = events.filter((e) => e.machineId === selectedMachine.id).slice(0, 5);

  const [history, setHistory] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showAlarmsModal, setShowAlarmsModal] = useState(false);

  useEffect(() => {
    if (selectedMachineId) {
       const initData = Array.from({ length: 30 }).map((_, i) => {
         const m = machines.find(x => x.id === selectedMachineId) || machines[0];
         return {
           timestamp: new Date(Date.now() - (29 - i) * 2000).toISOString(),
           oee: m.oee + (Math.random() * 4 - 2),
           availability: m.availability,
           performance: m.performance,
           quality: m.quality,
           powerKw: m.powerKw + (Math.random() * 2 - 1),
           temperatureC: m.temperatureC ? m.temperatureC + (Math.random() * 2 - 1) : 0,
           vibrationPct: m.vibrationPct ? m.vibrationPct + (Math.random() * 5 - 2.5) : 0,
           spindleSpeedRpm: m.spindleSpeedRpm ? m.spindleSpeedRpm + (Math.random() * 10 - 5) : 0,
           feedRateMmMin: m.feedRateMmMin ? m.feedRateMmMin + (Math.random() * 5 - 2.5) : 0,
           cuttingSpeedMMin: m.cuttingSpeedMMin,
           depthOfCutMm: m.depthOfCutMm,
           feedPerToothMm: m.feedPerToothMm,
           widthOfCutMm: m.widthOfCutMm,
           materialRemovalRateCm3Min: m.materialRemovalRateCm3Min,
           cycleTimeSec: m.cycleTimeSec,
         };
       });
       setHistory(initData);
    }
  }, [selectedMachineId, machines]);

  useEffect(() => {
     setHistory(prev => {
        if (prev.length === 0) return prev;
        const now = new Date().toISOString();
        const last = prev[prev.length - 1];
        if (new Date(now).getTime() - new Date(last.timestamp).getTime() < 1000) return prev;
        
        const newPoint = {
           timestamp: now,
           oee: selectedMachine.oee,
           availability: selectedMachine.availability,
           performance: selectedMachine.performance,
           quality: selectedMachine.quality,
           powerKw: selectedMachine.powerKw,
           temperatureC: selectedMachine.temperatureC || 0,
           vibrationPct: selectedMachine.vibrationPct || 0,
           spindleSpeedRpm: selectedMachine.spindleSpeedRpm || 0,
           feedRateMmMin: selectedMachine.feedRateMmMin || 0,
           cuttingSpeedMMin: selectedMachine.cuttingSpeedMMin,
           depthOfCutMm: selectedMachine.depthOfCutMm,
           feedPerToothMm: selectedMachine.feedPerToothMm,
           widthOfCutMm: selectedMachine.widthOfCutMm,
           materialRemovalRateCm3Min: selectedMachine.materialRemovalRateCm3Min,
           cycleTimeSec: selectedMachine.cycleTimeSec,
        };
        const updated = [...prev, newPoint];
        if (updated.length > 60) updated.shift();
        return updated;
     });
  }, [selectedMachine]);

  const oeeChartOptions = {
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    grid: { left: '1%', right: '1%', bottom: '5%', top: '5%', containLabel: false },
    xAxis: { 
       type: 'category', 
       boundaryGap: false,
       data: history.map(h => formatDateTime(h.timestamp).split(' ')[1] || ''), 
       axisLabel: { show: false },
       axisLine: { show: false },
       axisTick: { show: false },
       splitLine: { show: true, lineStyle: { color: '#333' } }
    },
    yAxis: { 
       type: 'value', 
       min: 0, 
       max: 100,
       splitLine: { show: true, lineStyle: { color: '#333' } },
       axisLabel: { show: false },
       axisLine: { show: false },
       axisTick: { show: false }
    },
    series: [
      { 
        name: 'OEE', 
        type: 'line', 
        data: history.map(h => h.oee), 
        itemStyle: { color: '#17a2b8' }, 
        smooth: false, 
        symbol: 'none', 
        lineStyle: { width: 1.5, color: '#17a2b8' },
        areaStyle: {
            color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                    { offset: 0, color: 'rgba(23, 162, 184, 0.5)' },
                    { offset: 1, color: 'rgba(23, 162, 184, 0.05)' }
                ]
            }
        }
      }
    ]
  };

  const getMetricChartOptions = (metricKey: string, color: string, name: string) => ({
      tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: color, textStyle: { color: '#fff' } },
      grid: { left: '1%', right: '1%', bottom: '5%', top: '5%', containLabel: false },
      xAxis: { 
         type: 'category', 
         boundaryGap: false,
         data: history.map(h => formatDateTime(h.timestamp).split(' ')[1] || ''), 
         axisLabel: { show: false },
         axisLine: { show: false },
         axisTick: { show: false },
         splitLine: { show: true, lineStyle: { color: '#333' } }
      },
      yAxis: { 
         type: 'value', 
         min: 'dataMin',
         splitLine: { show: true, lineStyle: { color: '#333' } },
         axisLabel: { show: false },
         axisLine: { show: false },
         axisTick: { show: false }
      },
      series: [
        { 
           name: name, 
           type: 'line', 
           data: history.map(h => h[metricKey as keyof typeof h] || 0), 
           itemStyle: { color: color }, 
           smooth: false, 
           symbol: 'none', 
           lineStyle: { width: 1.5 },
           areaStyle: { 
               opacity: 0.8,
               color: {
                   type: 'linear',
                   x: 0, y: 0, x2: 0, y2: 1,
                   colorStops: [
                       { offset: 0, color: color.replace(')', ', 0.5)').replace('rgb', 'rgba') },
                       { offset: 1, color: color.replace(')', ', 0.05)').replace('rgb', 'rgba') }
                   ]
               }
           }
        }
      ]
  });

  const allMetrics = [
      { key: 'powerKw', label: selectedLanguage === 'en' ? 'Power' : 'Điện năng', unit: 'kW', color: 'rgb(23, 162, 184)', value: selectedMachine.powerKw },
      { key: 'cycleTimeSec', label: messages.machine.cycleTime || 'Cycle Time', unit: 's', color: 'rgb(23, 162, 184)', value: selectedMachine.cycleTimeSec },
      ...(selectedMachine.spindleSpeedRpm !== undefined ? [{ key: 'spindleSpeedRpm', label: selectedLanguage === 'en' ? 'Spindle Speed' : 'Tốc độ trục chính', unit: 'rpm', color: 'rgb(23, 162, 184)', value: selectedMachine.spindleSpeedRpm }] : []),
      ...(selectedMachine.feedRateMmMin !== undefined ? [{ key: 'feedRateMmMin', label: selectedLanguage === 'en' ? 'Feed Rate' : 'Lượng chạy dao', unit: 'mm/min', color: 'rgb(23, 162, 184)', value: selectedMachine.feedRateMmMin }] : []),
      ...(selectedMachine.cuttingSpeedMMin !== undefined ? [{ key: 'cuttingSpeedMMin', label: selectedLanguage === 'en' ? 'Cutting Speed' : 'Vận tốc cắt', unit: 'm/min', color: 'rgb(23, 162, 184)', value: selectedMachine.cuttingSpeedMMin }] : []),
      ...(selectedMachine.depthOfCutMm !== undefined ? [{ key: 'depthOfCutMm', label: selectedLanguage === 'en' ? 'Depth of Cut' : 'Chiều sâu cắt', unit: 'mm', color: 'rgb(23, 162, 184)', value: selectedMachine.depthOfCutMm }] : []),
      ...(selectedMachine.feedPerToothMm !== undefined ? [{ key: 'feedPerToothMm', label: selectedLanguage === 'en' ? 'Feed per Tooth' : 'Lượng chạy dao răng', unit: 'mm/tooth', color: 'rgb(23, 162, 184)', value: selectedMachine.feedPerToothMm }] : []),
      ...(selectedMachine.widthOfCutMm !== undefined ? [{ key: 'widthOfCutMm', label: selectedLanguage === 'en' ? 'Width of Cut' : 'Chiều rộng cắt', unit: 'mm', color: 'rgb(23, 162, 184)', value: selectedMachine.widthOfCutMm }] : []),
      ...(selectedMachine.materialRemovalRateCm3Min !== undefined ? [{ key: 'materialRemovalRateCm3Min', label: selectedLanguage === 'en' ? 'MRR' : 'Tốc độ bóc tách VL', unit: 'cm³/min', color: 'rgb(23, 162, 184)', value: selectedMachine.materialRemovalRateCm3Min }] : []),
      ...(selectedMachine.temperatureC !== undefined ? [{ key: 'temperatureC', label: messages.machine.temperature || 'Temperature', unit: '°C', color: 'rgb(23, 162, 184)', value: selectedMachine.temperatureC }] : []),
      ...(selectedMachine.vibrationPct !== undefined ? [{ key: 'vibrationPct', label: messages.machine.vibration || 'Vibration', unit: '%', color: 'rgb(23, 162, 184)', value: selectedMachine.vibrationPct }] : []),
  ];

  const activeMetricObj = selectedMetric ? allMetrics.find(m => m.key === selectedMetric) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <Settings size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.machines} / {selectedMachine.name}
        </h1>
      </div>

      {/* Machine Selector */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {machines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => setSelectedMachineId(machine.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left flex items-start gap-3 ${
              selectedMachine.id === machine.id
                ? 'bg-industrial-border/20 border-industrial-border text-industrial-border'
                : 'bg-industrial-card border-industrial-border/20 hover:border-industrial-border/50'
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-industrial-border/30 mt-1">
              <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      machine.status === 'RUN'
                        ? '#22c55e'
                        : machine.status === 'FAULT'
                        ? '#ef4444'
                        : '#facc15',
                  }}
                ></div>
                <p className="font-semibold text-sm line-clamp-1">{machine.code}</p>
              </div>
              <p className="text-xs text-industrial-text-secondary line-clamp-1">
                {machine.name}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Machine Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Machine Image & Basic Info */}
          <div className="card-industrial p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group overflow-hidden rounded-lg">
                <img
                  src={selectedMachine.image}
                  alt={selectedMachine.name}
                  className="w-full h-56 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2 px-3 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white uppercase tracking-wider">
                  {selectedMachine.type}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="metric-label">{messages.machine.name}</p>
                  <p className="text-xl font-semibold text-industrial-text">
                    {selectedMachine.name}
                  </p>
                </div>
                <div>
                  <p className="metric-label">{messages.machine.brand || 'Brand'}</p>
                  <p className="text-md font-semibold text-industrial-text">
                    {selectedMachine.brand}
                  </p>
                </div>
                <div>
                  <p className="metric-label">{messages.machine.controller}</p>
                  <p className="text-sm text-industrial-text">{selectedMachine.controller}</p>
                </div>
                <div>
                  <p className="metric-label">{messages.machine.status}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{
                        backgroundColor:
                          selectedMachine.status === 'RUN'
                            ? '#22c55e'
                            : selectedMachine.status === 'FAULT'
                            ? '#ef4444'
                            : '#facc15',
                      }}
                    ></div>
                    <p className="text-sm font-semibold text-industrial-text">
                      {selectedMachine.status === 'RUN' && (selectedLanguage === 'en' ? 'Running' : 'Đang Chạy')}
                      {selectedMachine.status === 'FAULT' && (selectedLanguage === 'en' ? 'Fault' : 'Trục Trặc')}
                      {selectedMachine.status === 'IDLE' && (selectedLanguage === 'en' ? 'Idle' : 'Đang Chờ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
              <Cpu size={18} />
              {messages.machineDetail.parameterMonitoring}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('powerKw')}>
                 <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Power' : 'Điện'}</p>
                  <Zap size={16} className="text-industrial-success" />
                </div>
                <p className="text-2xl font-bold text-industrial-success">
                  {formatNumber(selectedMachine.powerKw, 1)} <span className="text-sm font-normal">kW</span>
                </p>
              </div>

              <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('cycleTimeSec')}>
                 <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-industrial-text-secondary">{messages.machine.cycleTime || 'Cycle'}</p>
                  <Clock size={16} className="text-industrial-info" />
                </div>
                <p className="text-2xl font-bold text-industrial-info">
                  {selectedMachine.cycleTimeSec}<span className="text-sm font-normal">s</span>
                </p>
              </div>

              {selectedMachine.spindleSpeedRpm !== undefined && selectedMachine.spindleSpeedRpm > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('spindleSpeedRpm')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Spindle Speed' : 'Tốc độ trục chính'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.spindleSpeedRpm} <span className="text-xs font-normal">rpm</span>
                  </p>
                </div>
              )}

              {selectedMachine.feedRateMmMin !== undefined && selectedMachine.feedRateMmMin > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('feedRateMmMin')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Feed Rate' : 'Lượng chạy dao'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.feedRateMmMin} <span className="text-xs font-normal">mm/min</span>
                  </p>
                </div>
              )}

              {selectedMachine.cuttingSpeedMMin !== undefined && selectedMachine.cuttingSpeedMMin > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('cuttingSpeedMMin')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Cutting Speed' : 'Vận tốc cắt'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.cuttingSpeedMMin} <span className="text-xs font-normal">m/min</span>
                  </p>
                </div>
              )}

              {selectedMachine.materialRemovalRateCm3Min !== undefined && selectedMachine.materialRemovalRateCm3Min > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('materialRemovalRateCm3Min')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'MRR' : 'Tốc độ bóc tách'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.materialRemovalRateCm3Min} <span className="text-xs font-normal">cm³/min</span>
                  </p>
                </div>
              )}
              
              {selectedMachine.temperatureC !== undefined && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('temperatureC')}>
                   <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-industrial-text-secondary">{messages.machine.temperature || 'Temp'}</p>
                    <Thermometer size={16} className={selectedMachine.temperatureC > 70 ? 'text-industrial-error' : 'text-industrial-warning'} />
                  </div>
                  <div className="flex items-end gap-2">
                    <p className={`text-xl font-bold ${selectedMachine.temperatureC > 70 ? 'text-industrial-error animate-pulse' : 'text-industrial-text'}`}>
                      {formatNumber(selectedMachine.temperatureC, 1)}°C
                    </p>
                  </div>
                  <div className="h-1 w-full bg-industrial-card mt-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((selectedMachine.temperatureC / 100) * 100, 100)}%`,
                        backgroundColor: selectedMachine.temperatureC > 70 ? '#ef4444' : selectedMachine.temperatureC > 50 ? '#facc15' : '#22c55e'
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              {selectedMachine.vibrationPct !== undefined && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('vibrationPct')}>
                   <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-industrial-text-secondary">{messages.machine.vibration || 'Vibration'}</p>
                    <Activity size={16} className="text-industrial-warning" />
                  </div>
                  <p className="text-xl font-bold text-industrial-warning">
                    {formatNumber(selectedMachine.vibrationPct, 1)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* OEE & Production Advanced Panel */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
              <BarChart3 size={18} />
              {selectedLanguage === 'en' ? 'OEE & Production Analytics' : 'Phân tích OEE & Sản lượng'}
            </h3>
            
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
              {/* Main OEE Score */}
              <div className="xl:col-span-3 bg-industrial-darker/50 p-4 rounded-xl border border-industrial-border/10 flex flex-col items-center justify-center relative">
                <p className="text-sm font-semibold text-industrial-text-secondary mb-3">OEE KPI</p>
                <div className="relative w-32 h-32 mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(30, 144, 255, 0.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={selectedMachine.oee >= 85 ? "#22c55e" : selectedMachine.oee >= 60 ? "#facc15" : "#ef4444"} strokeWidth="8" strokeDasharray={`${(selectedMachine.oee / 100) * 251.2} 251.2`} strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-industrial-text">{selectedMachine.oee}%</p>
                  </div>
                </div>
                <div className="text-center mt-3 flex flex-col items-center">
                  <p className={`px-4 py-1.5 rounded-full text-xs font-bold ${selectedMachine.oee >= 85 ? "bg-industrial-success/20 text-industrial-success" : selectedMachine.oee >= 60 ? "bg-industrial-warning/20 text-industrial-warning" : "bg-industrial-error/20 text-industrial-error"}`}>
                    OEE: {selectedMachine.oee}%
                  </p>
                </div>
              </div>

              {/* OEE Components Breakdown */}
              <div className="xl:col-span-5 space-y-4 flex flex-col justify-center bg-industrial-darker/30 p-5 rounded-xl border border-industrial-border/10">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Availability (A)' : 'Khả dụng (A)'}</span>
                    <span className="text-sm font-bold text-industrial-success">{selectedMachine.availability}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/10 overflow-hidden shadow-inner">
                    <div className="h-full bg-industrial-success transition-all duration-500" style={{width: `${selectedMachine.availability}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Performance (P)' : 'Hiệu suất (P)'}</span>
                    <span className="text-sm font-bold text-industrial-info">{selectedMachine.performance}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/10 overflow-hidden shadow-inner">
                    <div className="h-full bg-industrial-info transition-all duration-500" style={{width: `${selectedMachine.performance}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Quality (Q)' : 'Chất lượng (Q)'}</span>
                    <span className="text-sm font-bold text-industrial-warning">{selectedMachine.quality}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/10 overflow-hidden shadow-inner">
                    <div className="h-full bg-industrial-warning transition-all duration-500" style={{width: `${selectedMachine.quality}%`}}></div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-industrial-text-secondary bg-industrial-bg px-3 py-2 rounded-lg border border-industrial-border/5 inline-block">
                    <strong className="text-industrial-border">Formula:</strong> OEE = A × P × Q
                  </p>
                </div>
              </div>

              {/* Enhanced Production Stats */}
              <div className="xl:col-span-4 bg-industrial-darker/50 p-5 rounded-xl border border-industrial-border/10 flex flex-col justify-between">
                <h4 className="text-sm font-semibold text-industrial-text mb-4 pb-2 border-b border-industrial-border/10 flex items-center justify-between">
                  {selectedLanguage === 'en' ? 'Production Output' : 'Sản Lượng'}
                  <TrendingUp size={16} className="text-industrial-border" />
                </h4>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-industrial-card border border-industrial-border/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-industrial-border/10 flex items-center justify-center mb-3 text-industrial-border">
                         <Package size={24} />
                      </div>
                      <span className="text-3xl font-bold font-mono text-industrial-text">{selectedMachine.partCount}</span>
                      <span className="text-xs text-industrial-text-secondary mt-1">{messages.machine.partCount}</span>
                  </div>
                  <div className="bg-industrial-card border border-industrial-error/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-industrial-error/10 flex items-center justify-center mb-3 text-industrial-error">
                         <AlertTriangle size={24} />
                      </div>
                      <span className="text-3xl font-bold font-mono text-industrial-error">{selectedMachine.ngCount}</span>
                      <span className="text-xs text-industrial-error mt-1">{messages.machine.ngParts || 'NG Parts'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Validation Chart */}
            <div className="h-64 mt-2 border-t border-industrial-border/20 pt-6">
              <div className="flex justify-between items-center mb-2">
                 <h4 className="text-xs uppercase tracking-wider text-industrial-text-secondary flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-industrial-error animate-pulse"></span>
                   {selectedLanguage === 'en' ? 'Real-time OEE Analytics' : 'Biểu đồ OEE thời gian thực'}
                 </h4>
                 <h4 className="text-xs text-industrial-text-secondary">60 seconds</h4>
              </div>
              <div className="bg-[#111] p-1 rounded-lg h-full border border-[#333]">
                  <ReactECharts option={oeeChartOptions} style={{height: '100%', width: '100%'}} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Machine Health */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-4 text-center">
              {messages.machineDetail.machineHealthScore}
            </h3>
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(30, 144, 255, 0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={selectedMachine.machineHealth > 70 ? "#22c55e" : selectedMachine.machineHealth > 40 ? "#facc15" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={`${(selectedMachine.machineHealth / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-industrial-text">
                  {selectedMachine.machineHealth}
                </p>
              </div>
            </div>
            <p className="text-center text-sm font-medium" style={{color: selectedMachine.machineHealth > 70 ? "#22c55e" : selectedMachine.machineHealth > 40 ? "#facc15" : "#ef4444" }}>
              {selectedMachine.machineHealth > 80 ? (selectedLanguage === 'en' ? 'Excellent' : 'Rất Tốt') : ''}
              {selectedMachine.machineHealth <= 80 && selectedMachine.machineHealth > 60 ? (selectedLanguage === 'en' ? 'Good' : 'Tốt') : ''}
              {selectedMachine.machineHealth <= 60 && selectedMachine.machineHealth > 40 ? (selectedLanguage === 'en' ? 'Warning' : 'Cảnh Báo') : ''}
              {selectedMachine.machineHealth <= 40 ? (selectedLanguage === 'en' ? 'Critical' : 'Nguy Hiểm') : ''}
            </p>
          </div>

          {/* Maintenance & Alarms */}
          <div className="card-industrial p-6 space-y-4">
            <div>
              <p className="text-sm text-industrial-text-secondary mb-2">
                {messages.machine.maintenanceDue}
              </p>
              <p
                className={`text-2xl font-bold ${
                  selectedMachine.maintenanceDueDays <= 7
                    ? 'text-industrial-error animate-pulse'
                    : 'text-industrial-warning'
                }`}
              >
                {selectedMachine.maintenanceDueDays} {selectedLanguage === 'en' ? 'days' : 'ngày'}
              </p>
            </div>
            <div className="border-t border-industrial-border/20 pt-4">
              <p className="text-sm text-industrial-text-secondary mb-2">
                {messages.machine.activeAlarms}
              </p>
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-bold ${selectedMachine.activeAlarms > 0 ? 'text-industrial-error animate-pulse' : 'text-industrial-success'}`}>
                  {selectedMachine.activeAlarms}
                </p>
                {selectedMachine.activeAlarms > 0 && (
                  <button 
                    onClick={() => setShowAlarmsModal(true)}
                    className="px-3 py-1 bg-industrial-error/10 text-industrial-error border border-industrial-error/30 rounded text-xs hover:bg-industrial-error/30 transition-colors"
                  >
                    {selectedLanguage === 'en' ? 'View Details' : 'Xem chi tiết'}
                  </button>
                )}
              </div>
            </div>
            {selectedMachine.toolLifeRemainingPct !== undefined && (
              <div className="border-t border-industrial-border/20 pt-4">
                <p className="text-sm text-industrial-text-secondary mb-2">
                  {messages.machine.toolLife}
                </p>
                <div className="h-4 rounded-full bg-industrial-card border border-industrial-border/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedMachine.toolLifeRemainingPct}%`,
                      backgroundColor: selectedMachine.toolLifeRemainingPct > 30 ? '#1e90ff' : '#ef4444'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-industrial-text-secondary mt-2 flex justify-between">
                  <span>{selectedMachine.toolLifeRemainingPct}%</span>
                  <span>{selectedLanguage === 'en' ? 'Remaining' : 'Còn lại'}</span>
                </p>
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-4 text-sm">
              {messages.machineDetail.eventTimeline || 'Recent Events'}
            </h3>
            <div className="space-y-3">
              {machineEvents.length > 0 ? (
                machineEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-industrial-darker rounded border-l-4 shadow-sm"
                    style={{
                      borderColor:
                        event.severity === 'critical'
                          ? '#ef4444'
                          : event.severity === 'warning'
                          ? '#facc15'
                          : '#38bdf8',
                    }}
                  >
                    <p className="font-semibold text-industrial-text text-sm">
                      {event.title}
                    </p>
                    <p className="text-xs text-industrial-text-secondary mt-1">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-industrial-text-secondary text-center py-4 bg-industrial-darker rounded border border-dashed border-industrial-border/30">
                  {selectedLanguage === 'en' ? 'No recent events' : 'Không có sự kiện gần đây'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Manager Style Modal */}
      {selectedMetric && activeMetricObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMetric(null)}>
          <div className="bg-[#1e1e1e] border border-gray-700/50 rounded-xl shadow-2xl w-[90vw] max-w-5xl h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                 <Activity size={18} /> Performance
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setSelectedMetric(null)}>
                 <X size={24} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
               {/* Fixed left sidebar for metrics list */}
               <div className="w-1/3 border-r border-gray-800 bg-[#181818] overflow-y-auto">
                  {allMetrics.map(m => (
                      <div 
                         key={m.key} 
                         onClick={() => setSelectedMetric(m.key)}
                         className={`p-3 border-b border-gray-800/50 cursor-pointer transition-colors flex flex-col gap-1 ${selectedMetric === m.key ? 'bg-[#2d2d2d] border-l-4 border-l-[#17a2b8]' : 'hover:bg-[#252525] border-l-4 border-l-transparent'}`}
                      >
                         <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{m.label}</span>
                         </div>
                         <div className="flex justify-between items-end">
                            <span className="text-xs text-gray-500">Utilization</span>
                            <span className="text-lg font-semibold text-gray-100">{typeof m.value === 'number' ? formatNumber(m.value, 1) : m.value} {m.unit}</span>
                         </div>
                      </div>
                  ))}
               </div>
               
               {/* Main Chart Area */}
               <div className="flex-1 flex flex-col bg-[#111] p-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-2xl font-light text-gray-100">{activeMetricObj.label}</h3>
                     <span className="text-sm font-medium text-gray-300">{typeof activeMetricObj.value === 'number' ? formatNumber(activeMetricObj.value, 1) : activeMetricObj.value} {activeMetricObj.unit}</span>
                  </div>
                  
                  <div className="flex-1 min-h-0 border border-[#333] relative">
                     <ReactECharts option={getMetricChartOptions(activeMetricObj.key, activeMetricObj.color, activeMetricObj.label)} style={{height: '100%', width: '100%'}} />
                  </div>
                  
                  <div className="mt-4 grid grid-cols-4 gap-4 text-sm text-gray-400">
                     <div className="flex flex-col">
                        <span>60 seconds</span>
                        <span className="text-xs mt-1">Utilization</span>
                        <span className="text-xl text-gray-200">{typeof activeMetricObj.value === 'number' ? formatNumber(activeMetricObj.value, 1) : activeMetricObj.value} {activeMetricObj.unit}</span>
                     </div>
                     <div className="flex flex-col">
                        <span>Max Recorded</span>
                        <span className="text-xl text-gray-200">{formatNumber(Math.max(...history.map(h => Number(h[activeMetricObj.key]) || 0)), 1)}</span>
                     </div>
                     <div className="flex flex-col">
                        <span>Average</span>
                        <span className="text-xl text-gray-200">{formatNumber(history.reduce((a, b) => a + (Number(b[activeMetricObj.key]) || 0), 0) / (history.length || 1), 1)}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Alarms Modal */}
      {showAlarmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAlarmsModal(false)}>
          <div className="bg-[#1e1e1e] border border-industrial-error/50 rounded-xl shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-industrial-border/20 bg-industrial-error/5">
              <h2 className="text-lg font-semibold text-industrial-error flex items-center gap-2">
                 <AlertTriangle size={20} />
                 {selectedLanguage === 'en' ? 'Active Alerts' : 'Cảnh báo hệ thống'} - {selectedMachine.name}
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setShowAlarmsModal(false)}>
                 <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-[#111]">
              {events.filter(e => e.machineId === selectedMachine.id && e.severity !== 'info').map(event => (
                <div key={event.id} className="p-4 rounded-lg bg-[#181818] border border-industrial-error/30 border-l-4 border-l-industrial-error">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-industrial-text">{event.title}</h3>
                    <span className="text-xs text-gray-500 font-mono">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{event.message}</p>
                </div>
              ))}
              {events.filter(e => e.machineId === selectedMachine.id && e.severity !== 'info').length === 0 && (
                <p className="text-center text-gray-500 py-8">{selectedLanguage === 'en' ? 'No active clearable alerts' : 'Không có cảnh báo'}</p>
              )}
            </div>
            <div className="p-4 border-t border-industrial-border/20 bg-[#1e1e1e] flex justify-end gap-3">
               <button onClick={() => setShowAlarmsModal(false)} className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                  {selectedLanguage === 'en' ? 'Close' : 'Đóng'}
               </button>
               <button 
                  onClick={() => {
                     useMachineStore.getState().acknowledgeAlarms(selectedMachine.id);
                     setShowAlarmsModal(false);
                  }} 
                  className="px-4 py-2 rounded bg-industrial-success/20 border border-industrial-success/50 text-industrial-success hover:bg-industrial-success/40 transition-colors font-medium"
               >
                  {selectedLanguage === 'en' ? 'Acknowledge All' : 'Xác nhận toàn bộ lỗi'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MachinesPage = () => {
  return (
    <Suspense fallback={<div className="p-8 text-center text-industrial-border animate-pulse">Loading machine details...</div>}>
      <MachineDetailContent />
    </Suspense>
  );
};

export default MachinesPage;

