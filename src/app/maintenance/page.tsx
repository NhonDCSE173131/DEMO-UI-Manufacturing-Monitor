'use client';

import { useMachineStore } from '@/lib/store';
import { useMachinesData } from '@/hooks/useMachinesData';
import { formatNumber } from '@/lib/utils';
import { Wrench, AlertTriangle, X, ShieldCheck, CalendarClock, Thermometer, Waves, Cpu } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { useState } from 'react';

const MaintenancePage = () => {
  const { selectedLanguage, resolveMaintenance } = useMachineStore();
  const { machines, loading, error } = useMachinesData();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const [maintainingMachineId, setMaintainingMachineId] = useState<string | null>(null);
  const [maintainerName, setMaintainerName] = useState('');
  const [maintenanceTime, setMaintenanceTime] = useState(new Date().toISOString().slice(0, 16));
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const riskMachines = machines
    .filter((m) => m.maintenanceDueDays <= 14 || (m.predictions?.maintenanceRisk ?? 'low') !== 'low')
    .sort((a, b) => a.maintenanceDueDays - b.maintenanceDueDays);

  const dueSoon = [...machines].sort((a, b) => a.maintenanceDueDays - b.maintenanceDueDays).slice(0, 6);

  const getComponentBreakdown = (machine: (typeof machines)[number]) => {
    const motor = Math.min(100, Math.round((machine.rawTelemetry?.servoLoadPct ?? 0) * 1.1));
    const spindle = Math.min(100, Math.round((machine.rawTelemetry?.spindleRpm ?? machine.spindleSpeedRpm ?? 0) / 60));
    const vibration = Math.min(100, Math.round(machine.rawTelemetry?.vibrationPct ?? machine.vibrationPct ?? 0));
    const thermal = Math.min(100, Math.round((machine.rawTelemetry?.temperatureC ?? machine.temperatureC ?? 0) * 1.2));
    const electrical = Math.min(100, Math.round((machine.rawTelemetry?.powerKw ?? machine.powerKw) * 3));
    return [
      { key: 'motor', label: 'Motor', risk: motor },
      { key: 'spindle', label: 'Spindle', risk: spindle },
      { key: 'vibration', label: 'Vibration', risk: vibration },
      { key: 'thermal', label: 'Thermal', risk: thermal },
      { key: 'electrical', label: 'Electrical', risk: electrical },
    ];
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: messages.maintenance.critical, textClass: 'text-industrial-error', borderClass: 'border-industrial-error/30', bgClass: 'bg-industrial-error/10' };
    if (score >= 60) return { label: messages.maintenance.high, textClass: 'text-industrial-warning', borderClass: 'border-industrial-warning/30', bgClass: 'bg-industrial-warning/10' };
    if (score >= 40) return { label: messages.maintenance.medium, textClass: 'text-industrial-info', borderClass: 'border-industrial-info/30', bgClass: 'bg-industrial-info/10' };
    return { label: messages.maintenance.low, textClass: 'text-industrial-success', borderClass: 'border-industrial-success/30', bgClass: 'bg-industrial-success/10' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {(loading || error) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {loading
            ? (selectedLanguage === 'en' ? 'Loading maintenance data from backend...' : 'Đang tải dữ liệu bảo trì từ backend...')
            : `${selectedLanguage === 'en' ? 'Backend unavailable. Showing local fallback.' : 'Backend tạm thời không phản hồi. Đang hiển thị dữ liệu dự phòng.'} ${error || ''}`}
        </div>
      )}

      {/* Maintenance Schedule Notice */}
      {riskMachines.length > 0 && (
        <div className="card-industrial p-6 border-industrial-warning/50 bg-industrial-warning/5">
          <h3 className="panel-title text-industrial-warning mb-4">
            <AlertTriangle size={18} />
            {messages.maintenance.maintenanceSchedule}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {riskMachines.map((machine) => (
              <div
                key={machine.id}
                className={`p-4 rounded-lg border ${
                  machine.maintenanceDueDays <= 7
                    ? 'bg-industrial-error/10 border-industrial-error/40 pulse-error'
                    : 'bg-industrial-warning/10 border-industrial-warning/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full border border-industrial-border/30 overflow-hidden shrink-0">
                      <img src={machine.image} alt="" className="w-full h-full object-cover"/>
                    </div>
                    <div>
                      <p className="font-semibold text-industrial-text">{machine.name}</p>
                      <p className="text-xs text-industrial-text-secondary">
                        {messages.maintenance.daysRemaining}: {machine.maintenanceDueDays} {selectedLanguage === 'en' ? messages.maintenance.days : messages.maintenance.daysUnit}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold bg-industrial-bg px-2 py-1 rounded border ${
                      machine.maintenanceDueDays <= 7
                        ? 'text-industrial-error border-industrial-error/30'
                        : 'text-industrial-warning border-industrial-warning/30'
                    }`}
                  >
                    {machine.maintenanceDueDays <= 7 ? messages.maintenance.urgent : messages.maintenance.soon}
                  </span>
                </div>

                <div className="flex justify-end mb-3">
                  <button 
                    onClick={() => setMaintainingMachineId(machine.id)}
                    className="text-xs px-3 py-1.5 rounded bg-industrial-success/20 text-industrial-success border border-industrial-success/30 hover:bg-industrial-success/40 transition-colors"
                  >
                    {messages.maintenance.confirmDone}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-industrial-darker p-2 rounded border border-industrial-border/20">
                  <div>
                    <p className="text-industrial-text-secondary">{messages.maintenance.riskScore}</p>
                    <p className="font-semibold text-industrial-error">{100 - machine.machineHealth}%</p>
                  </div>
                  <div>
                    <p className="text-industrial-text-secondary">{messages.maintenance.estimatedDowntime}</p>
                    <p className="font-semibold">2-4 {selectedLanguage === 'en' ? messages.maintenance.hours : messages.maintenance.hoursUnit}</p>
                  </div>
                  <div>
                    <p className="text-industrial-text-secondary">{messages.maintenance.recommendedAction}</p>
                    <p className="font-semibold">{machine.predictions?.recommendation || messages.maintenance.fullInspection}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-industrial p-6">
        <h3 className="panel-title mb-4">
          <CalendarClock size={18} />
          {selectedLanguage === 'en' ? 'Due-Soon Timeline' : 'Timeline sap den han'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {dueSoon.map((machine) => (
            <div key={`timeline-${machine.id}`} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
              <p className="text-sm font-semibold text-industrial-text">{machine.name}</p>
              <p className="text-xs text-industrial-text-secondary mb-2">{machine.code}</p>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20 overflow-hidden mb-2">
                <div
                  className={`h-full ${machine.maintenanceDueDays <= 7 ? 'bg-industrial-error' : machine.maintenanceDueDays <= 14 ? 'bg-industrial-warning' : 'bg-industrial-success'}`}
                  style={{ width: `${Math.max(8, 100 - machine.maintenanceDueDays)}%` }}
                ></div>
              </div>
              <p className={`text-xs font-medium ${machine.maintenanceDueDays <= 7 ? 'text-industrial-error' : machine.maintenanceDueDays <= 14 ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                {machine.maintenanceDueDays} {selectedLanguage === 'en' ? 'days remaining' : 'ngay con lai'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Health Ranking */}
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-6">
            <ShieldCheck size={18} />
            {messages.maintenance.machineHealthRanking}
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {machines
              .sort((a, b) => b.machineHealth - a.machineHealth)
              .map((machine, idx) => {
                const riskScore = 100 - machine.machineHealth;
                const risk = getRiskLevel(riskScore);
                return (
                  <div key={machine.id} className="p-4 bg-industrial-darker rounded-lg border border-industrial-border/20 hover:bg-industrial-card transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-bold text-industrial-border w-6 shrink-0">#{idx + 1}</span>
                          <div className="w-8 h-8 rounded-full border border-industrial-border/30 overflow-hidden shrink-0">
                            <img src={machine.image} alt="" className="w-full h-full object-cover"/>
                          </div>
                          <div>
                            <p className="font-semibold text-industrial-text">{machine.name}</p>
                            <p className="text-xs text-industrial-text-secondary">{machine.code}</p>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded text-sm font-semibold border ${risk.textClass} ${risk.borderClass} ${risk.bgClass}`}>
                        {machine.machineHealth}% · {risk.label}
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-industrial-card overflow-hidden border border-industrial-border/20 mb-3 mt-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${machine.machineHealth}%`,
                          backgroundColor:
                            machine.machineHealth >= 80
                              ? '#22c55e'
                              : machine.machineHealth >= 60
                              ? '#facc15'
                              : '#ef4444',
                        }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-industrial-text-secondary">{messages.maintenance.anomalyScore}</p>
                        <p className={`font-semibold ${machine.anomalyScore > 0.5 ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                          {formatNumber(machine.anomalyScore * 100, 0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">{messages.maintenance.maintenanceDue}</p>
                        <p className={`font-semibold ${machine.maintenanceDueDays <= 7 ? 'text-industrial-error animate-pulse' : 'text-industrial-text'}`}>
                          {machine.maintenanceDueDays}d
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">{messages.machine.status}</p>
                        <p className="font-semibold text-industrial-text flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor: machine.status === 'RUN' ? '#22c55e' : machine.status === 'FAULT' ? '#ef4444' : '#60a5fa'}}></span>
                          {machine.status}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="card-industrial p-6">
          <h3 className="panel-title mb-6">
            <AlertTriangle size={18} />
            {messages.maintenance.riskAssessment}
          </h3>
          <div className="space-y-4">
            {machines.map((machine) => {
              const riskFactors = [];
              if (machine.anomalyScore > 0.7) riskFactors.push({text: messages.maintenance.highAnomalyScore, level: 'warning'});
              if (machine.maintenanceDueDays <= 7) riskFactors.push({text: messages.maintenance.maintenanceOverdue, level: 'error'});
              if (machine.machineHealth < 60) riskFactors.push({text: messages.maintenance.poorMachineHealth, level: 'error'});
              if (machine.temperatureC && machine.temperatureC > 75) riskFactors.push({text: messages.maintenance.highTemperature, level: 'warning'});
              if (machine.vibrationPct && machine.vibrationPct > 60) riskFactors.push({text: messages.maintenance.highVibration, level: 'error'});

              if (riskFactors.length === 0) return null;

              return (
                <div key={machine.id} className="p-4 bg-industrial-darker rounded-lg border border-industrial-border/20 border-l-4" style={{borderLeftColor: riskFactors.some(f => f.level === 'error') ? '#ef4444' : '#facc15' }}>
                  <div className="flex gap-3 items-center mb-3">
                    <div className="w-8 h-8 rounded-full border border-industrial-border/30 overflow-hidden shrink-0">
                      <img src={machine.image} alt="" className="w-full h-full object-cover"/>
                    </div>
                    <p className="font-semibold text-industrial-text">{machine.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {riskFactors.map((factor, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 ${factor.level === 'error' ? 'bg-industrial-error/10 text-industrial-error border-industrial-error/30' : 'bg-industrial-warning/10 text-industrial-warning border-industrial-warning/30'}`}
                      >
                        <AlertTriangle size={12} />
                        {factor.text}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
                    {getComponentBreakdown(machine).map((component) => (
                      <div key={`${machine.id}-${component.key}`} className="bg-industrial-bg/40 border border-industrial-border/10 rounded p-2">
                        <p className="text-[10px] uppercase text-industrial-text-secondary">{component.label}</p>
                        <p className={`text-sm font-semibold ${component.risk >= 75 ? 'text-industrial-error' : component.risk >= 55 ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                          {component.risk}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 rounded-lg bg-industrial-dark/40 border border-industrial-border/20 text-xs text-industrial-text-secondary">
                    <p className="font-semibold text-industrial-text mb-1">{selectedLanguage === 'en' ? 'Observed vs Recommended' : 'Quan sát và khuyến nghị'}</p>
                    <p>{selectedLanguage === 'en' ? 'Observed:' : 'Quan sát:'} {formatNumber(machine.rawTelemetry?.temperatureC ?? machine.temperatureC ?? 0, 1)}C · {formatNumber(machine.rawTelemetry?.vibrationPct ?? machine.vibrationPct ?? 0, 0)}% vibration · {formatNumber(machine.rawTelemetry?.powerKw ?? machine.powerKw, 1)}kW</p>
                    <p>{selectedLanguage === 'en' ? 'Recommended:' : 'Khuyến nghị:'} {machine.predictions?.recommendation || messages.maintenance.fullInspection}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Maintenance Confirmation Modal */}
      {maintainingMachineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMaintainingMachineId(null)}>
          <div className="bg-[#1e1e1e] border border-industrial-border/30 rounded-xl shadow-2xl w-[90vw] max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-industrial-border/20 bg-industrial-darker">
              <h2 className="text-lg font-semibold text-industrial-text flex items-center gap-2">
                 <Wrench size={20} className="text-industrial-border" />
                 {messages.maintenance.confirmMaintenance}
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setMaintainingMachineId(null)}>
                 <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm text-industrial-text-secondary mb-1">
                     {messages.maintenance.maintainerName}
                  </label>
                  <input
                     type="text"
                     value={maintainerName}
                     onChange={(e) => setMaintainerName(e.target.value)}
                     placeholder={messages.maintenance.maintainerNamePlaceholder}
                     className="w-full bg-[#111] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-industrial-border"
                  />
               </div>
               <div>
                  <label className="block text-sm text-industrial-text-secondary mb-1">
                     {messages.maintenance.maintenanceTime}
                  </label>
                  <input
                     type="datetime-local"
                     value={maintenanceTime}
                     onChange={(e) => setMaintenanceTime(e.target.value)}
                     className="w-full bg-[#111] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-industrial-border"
                     max={new Date().toISOString().slice(0, 16)}
                  />
               </div>
               <div>
                  <label className="block text-sm text-industrial-text-secondary mb-1">
                     {messages.maintenance.notesOptional}
                  </label>
                  <input
                     type="text"
                     value={maintenanceNotes}
                     onChange={(e) => setMaintenanceNotes(e.target.value)}
                     placeholder={messages.maintenance.notesPlaceholder}
                     className="w-full bg-[#111] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-industrial-border"
                  />
               </div>
            </div>
            <div className="p-4 border-t border-industrial-border/20 bg-industrial-darker flex justify-end gap-3">
               <button onClick={() => setMaintainingMachineId(null)} className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                  {messages.common.cancel}
               </button>
               <button 
                  onClick={() => {
                     if (!maintainerName.trim()) {
                        alert(messages.maintenance.enterNameAlert);
                        return;
                     }
                     resolveMaintenance(maintainingMachineId, {
                        maintainer: maintainerName,
                        timestamp: new Date(maintenanceTime).toISOString(),
                        notes: maintenanceNotes
                     });
                     setMaintainingMachineId(null);
                     setMaintainerName('');
                     setMaintenanceNotes('');
                  }} 
                  className="px-4 py-2 rounded bg-industrial-success/20 border border-industrial-success/50 text-industrial-success hover:bg-industrial-success/40 transition-colors font-medium"
               >
                  {messages.maintenance.confirm}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;

