'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Wrench, CheckCircle, AlertTriangle, AlertCircle, Calendar, CalendarCheck, FileText, Check, X, ShieldCheck } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { useState } from 'react';

const MaintenancePage = () => {
  const { machines, selectedLanguage, resolveMaintenance } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const [maintainingMachineId, setMaintainingMachineId] = useState<string | null>(null);
  const [maintainerName, setMaintainerName] = useState('');
  const [maintenanceTime, setMaintenanceTime] = useState(new Date().toISOString().slice(0, 16));
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const criticalMaintenance = machines.filter((m) => m.maintenanceDueDays <= 7).sort((a, b) => a.maintenanceDueDays - b.maintenanceDueDays);
  const riskMachines = machines.filter((m) => m.maintenanceDueDays <= 14).sort((a, b) => a.maintenanceDueDays - b.maintenanceDueDays);

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'CRITICAL', color: 'industrial-error', bg: 'bg-industrial-error/10' };
    if (score >= 60) return { label: 'HIGH', color: 'industrial-warning', bg: 'bg-industrial-warning/10' };
    if (score >= 40) return { label: 'MEDIUM', color: 'industrial-info', bg: 'bg-industrial-info/10' };
    return { label: 'LOW', color: 'industrial-success', bg: 'bg-industrial-success/10' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Wrench size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.maintenance}
        </h1>
      </div>

      {/* Maintenance Schedule Notice */}
      {riskMachines.length > 0 && (
        <div className="card-industrial p-6 border-industrial-warning/50 bg-industrial-warning/5">
          <h3 className="text-industrial-warning font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {messages.maintenance.maintenanceSchedule}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {riskMachines.map((machine) => (
              <div
                key={machine.id}
                className={`p-4 rounded-lg border ${
                  machine.maintenanceDueDays <= 7
                    ? 'bg-industrial-error/10 border-industrial-error/30'
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
                        {messages.maintenance.daysRemaining}: {machine.maintenanceDueDays} {selectedLanguage === 'en' ? 'days' : 'ngày'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold bg-industrial-bg px-2 py-1 rounded ${
                      machine.maintenanceDueDays <= 7
                        ? 'text-industrial-error'
                        : 'text-industrial-warning'
                    }`}
                  >
                    {machine.maintenanceDueDays <= 7 ? 'URGENT' : 'SOON'}
                  </span>
                </div>

                <div className="flex justify-end mb-3">
                  <button 
                    onClick={() => resolveMaintenance(machine.id)}
                    className="text-xs px-3 py-1.5 rounded bg-industrial-success/20 text-industrial-success border border-industrial-success/30 hover:bg-industrial-success/40 transition-colors"
                  >
                    {selectedLanguage === 'en' ? 'Confirm Maintenance Done' : 'Đã bảo trì'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-industrial-darker p-2 rounded">
                  <div>
                    <p className="text-industrial-text-secondary">Risk Score</p>
                    <p className="font-semibold text-industrial-error">{100 - machine.machineHealth}%</p>
                  </div>
                  <div>
                    <p className="text-industrial-text-secondary">Est. Downtime</p>
                    <p className="font-semibold">2-4 {selectedLanguage === 'en' ? 'hours' : 'giờ'}</p>
                  </div>
                  <div>
                    <p className="text-industrial-text-secondary">Recommended</p>
                    <p className="font-semibold">Full inspection</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Health Ranking */}
        <div className="card-industrial p-6">
          <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
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
                      <div className={`px-3 py-1 rounded text-sm font-semibold border text-${risk.color} border-${risk.color}/30 bg-${risk.color}/10`}>
                        {machine.machineHealth}%
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
                        <p className="text-industrial-text-secondary">Anomaly Score</p>
                        <p className={`font-semibold ${machine.anomalyScore > 0.5 ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                          {formatNumber(machine.anomalyScore * 100, 0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">Maintenance Due</p>
                        <p className={`font-semibold ${machine.maintenanceDueDays <= 7 ? 'text-industrial-error animate-pulse' : 'text-industrial-text'}`}>
                          {machine.maintenanceDueDays}d
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">Status</p>
                        <p className="font-semibold text-industrial-text flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor: machine.status === 'RUN' ? '#22c55e' : machine.status === 'FAULT' ? '#ef4444' : '#facc15'}}></span>
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
          <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
            <AlertTriangle size={18} />
            Risk Assessment
          </h3>
          <div className="space-y-4">
            {machines.map((machine) => {
              const riskFactors = [];
              if (machine.anomalyScore > 0.7) riskFactors.push({text: 'High anomaly score', level: 'warning'});
              if (machine.maintenanceDueDays <= 7) riskFactors.push({text: 'Maintenance overdue', level: 'error'});
              if (machine.machineHealth < 60) riskFactors.push({text: 'Poor machine health', level: 'error'});
              if (machine.temperatureC && machine.temperatureC > 75) riskFactors.push({text: 'High temperature', level: 'warning'});
              if (machine.vibrationPct && machine.vibrationPct > 60) riskFactors.push({text: 'High vibration', level: 'error'});

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
                        {selectedLanguage === 'vi' ? factor.text.replace('High anomaly score', 'Điểm bất thường cao').replace('Maintenance overdue', 'Quá hạn bảo trì').replace('Poor machine health', 'Sức khoẻ máy kém').replace('High temperature', 'Nhiệt độ cao').replace('High vibration', 'Độ rung cao') : factor.text}
                      </span>
                    ))}
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
                 {selectedLanguage === 'en' ? 'Confirm Maintenance' : 'Xác nhận bảo trì'}
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setMaintainingMachineId(null)}>
                 <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm text-industrial-text-secondary mb-1">
                     {selectedLanguage === 'en' ? 'Maintainer Name' : 'Tên người bảo trì'}
                  </label>
                  <input
                     type="text"
                     value={maintainerName}
                     onChange={(e) => setMaintainerName(e.target.value)}
                     placeholder={selectedLanguage === 'en' ? 'Enter name...' : 'Nhập tên...'}
                     className="w-full bg-[#111] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-industrial-border"
                  />
               </div>
               <div>
                  <label className="block text-sm text-industrial-text-secondary mb-1">
                     {selectedLanguage === 'en' ? 'Maintenance Time' : 'Thời gian bảo trì'}
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
                     {selectedLanguage === 'en' ? 'Notes (Optional)' : 'Ghi chú (Tuỳ chọn)'}
                  </label>
                  <input
                     type="text"
                     value={maintenanceNotes}
                     onChange={(e) => setMaintenanceNotes(e.target.value)}
                     placeholder={selectedLanguage === 'en' ? 'Enter notes...' : 'Nhập ghi chú...'}
                     className="w-full bg-[#111] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-industrial-border"
                  />
               </div>
            </div>
            <div className="p-4 border-t border-industrial-border/20 bg-industrial-darker flex justify-end gap-3">
               <button onClick={() => setMaintainingMachineId(null)} className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                  {selectedLanguage === 'en' ? 'Cancel' : 'Huỷ'}
               </button>
               <button 
                  onClick={() => {
                     if (!maintainerName.trim()) {
                        alert(selectedLanguage === 'en' ? 'Please enter a name.' : 'Vui lòng nhập tên.');
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
                  {selectedLanguage === 'en' ? 'Confirm' : 'Xác nhận'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;

