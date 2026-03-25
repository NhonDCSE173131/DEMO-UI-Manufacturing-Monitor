'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Activity, Zap, CheckCircle, AlertTriangle, AlertCircle, Settings, Power } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import Link from 'next/link';

const MetricCard = ({ label, value, unit, icon: Icon }: any) => (
  <div className="card-industrial p-4 col-span-1">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="metric-label">{label}</p>
        <p className="metric-number mt-2">
          {typeof value === 'number' ? formatNumber(value, 1) : value}
        </p>
        {unit && <p className="text-xs text-industrial-text-secondary mt-1">{unit}</p>}
      </div>
      {Icon && <Icon className="text-industrial-border opacity-50" size={32} />}
    </div>
  </div>
);

const Dashboard = () => {
  const { machines, selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  // Calculate metrics
  const totalPower = machines.reduce((sum, m) => sum + m.powerKw, 0);
  const totalEnergy = machines.reduce((sum, m) => sum + m.energyTodayKwh, 0);
  const totalProduction = machines.reduce((sum, m) => sum + m.partCount, 0);
  const totalGood = machines.reduce((sum, m) => sum + m.goodCount, 0);
  const totalNG = machines.reduce((sum, m) => sum + m.ngCount, 0);
  const avgOEE = Math.round(machines.reduce((sum, m) => sum + m.oee, 0) / machines.length);
  const runningMachines = machines.filter((m) => m.status === 'RUN').length;
  const faultMachines = machines.filter((m) => m.status === 'FAULT').length;
  const idleMachines = machines.filter((m) => m.status === 'IDLE').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Activity size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.dashboard}
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={messages.dashboard.oeAverage}
          value={avgOEE}
          unit="%"
          icon={Activity}
        />
        <MetricCard
          label={messages.dashboard.totalPower}
          value={totalPower}
          unit="kW"
          icon={Power}
        />
        <MetricCard
          label={messages.dashboard.totalEnergyToday}
          value={totalEnergy}
          unit="kWh"
          icon={Zap}
        />
        <MetricCard
          label={messages.dashboard.totalProduction}
          value={totalProduction}
          unit="parts"
          icon={CheckCircle}
        />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-industrial-border" />
            <h3 className="text-industrial-border font-semibold">
              {messages.dashboard.machinesStatus}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Running' : 'Đang Chạy'}</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-industrial-success"></div>
                <span className="font-bold text-industrial-success">{runningMachines}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Fault' : 'Trục Trặc'}</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-industrial-error"></div>
                <span className="font-bold text-industrial-error">{faultMachines}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Idle' : 'Đang Chờ'}</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-industrial-warning"></div>
                <span className="font-bold text-industrial-warning">
                  {idleMachines}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-industrial-border" />
            <h3 className="text-industrial-border font-semibold">
              {messages.dashboard.goodNgRatio}
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-industrial-text-secondary">Good</span>
                <span className="font-bold text-industrial-success">{totalGood}</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div
                  className="h-full bg-industrial-success rounded-full"
                  style={{
                    width: `${totalProduction > 0 ? Math.min((totalGood / totalProduction) * 100, 100) : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-industrial-text-secondary">NG</span>
                <span className="font-bold text-industrial-error">{totalNG}</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div
                  className="h-full bg-industrial-error rounded-full"
                  style={{
                    width: `${totalProduction > 0 ? Math.min((totalNG / totalProduction) * 100, 100) : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-industrial p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-industrial-error" />
            <h3 className="text-industrial-border font-semibold">
              {messages.dashboard.activeAlarms}
            </h3>
          </div>
          <div className="text-4xl font-bold text-industrial-error mb-2">
            {machines.reduce((sum, m) => sum + m.activeAlarms, 0)}
          </div>
          <p className="text-sm text-industrial-text-secondary">
            {selectedLanguage === 'en' ? 'Active across all machines' : 'Đang hoạt động trên toàn hệ thống'}
          </p>
          <div className="mt-4 pt-4 border-t border-industrial-border/20 max-h-24 overflow-y-auto">
            {machines
              .filter((m) => m.activeAlarms > 0)
              .map((m) => (
                <div key={m.id} className="text-sm text-industrial-warning py-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-industrial-warning">
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  </div>
                  <span>{m.name}: {m.activeAlarms} {selectedLanguage === 'en' ? 'alarm(s)' : 'cảnh báo'}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Machines List */}
      <div className="card-industrial p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={20} className="text-industrial-border" />
          <h3 className="text-industrial-border font-semibold">
            {messages.dashboard.machinesList}
          </h3>
        </div>
        <div className="space-y-3">
          {machines.map((machine) => (
            <Link href={`/machines?id=${machine.id}`} key={machine.id}>
              <div
                className="p-4 bg-industrial-bg rounded-lg border border-industrial-border/20 hover:border-industrial-border/50 transition-all cursor-pointer hover:bg-industrial-dark/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{
                      backgroundColor: machine.status === 'RUN' ? '#22c55e' : machine.status === 'FAULT' ? '#ef4444' : '#facc15'
                    }}></div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-industrial-border/30 shrink-0">
                      <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-industrial-text hover:text-industrial-border transition-colors">{machine.name}</p>
                      <p className="text-xs text-industrial-text-secondary">{machine.code} • {machine.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-industrial-border">{machine.oee}%</p>
                    <p className="text-xs text-industrial-text-secondary">OEE</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs mt-3">
                  <div>
                    <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Power' : 'Điện'}:</span>
                    <p className="font-semibold text-industrial-text">{formatNumber(machine.powerKw, 1)} kW</p>
                  </div>
                  <div>
                    <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Cycle' : 'Chu kỳ'}:</span>
                    <p className="font-semibold text-industrial-text">{machine.cycleTimeSec}s</p>
                  </div>
                  <div>
                    <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Parts' : 'Sản lượng'}:</span>
                    <p className="font-semibold text-industrial-text">{machine.partCount}</p>
                  </div>
                  <div>
                    <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Health' : 'Sức khoẻ'}:</span>
                    <p className="font-semibold text-industrial-text">{machine.machineHealth}%</p>
                  </div>
                  <div>
                    <span className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Temp' : 'Nhiệt độ'}:</span>
                    <p className="font-semibold text-industrial-warning">{formatNumber(machine.temperatureC || 0, 1)}°C</p>
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

