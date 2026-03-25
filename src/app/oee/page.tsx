'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { BarChart3, Activity, Download } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const OEEPage = () => {
  const { machines, selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const avgOEE = Math.round(machines.reduce((sum, m) => sum + m.oee, 0) / machines.length);
  const avgAvailability = Math.round(machines.reduce((sum, m) => sum + m.availability, 0) / machines.length);
  const avgPerformance = Math.round(machines.reduce((sum, m) => sum + m.performance, 0) / machines.length);
  const avgQuality = Math.round(machines.reduce((sum, m) => sum + m.quality, 0) / machines.length);

  const oeeTarget = 85;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.oeeAnalytics}
        </h1>
      </div>

      {/* Overall OEE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <span className="text-industrial-warning">⚠️ {oeeTarget - avgOEE}% {selectedLanguage === 'en' ? 'below target' : 'dưới mục tiêu'}</span>
            }
          </p>
        </div>

        <div className="card-industrial p-6 flex flex-col justify-center">
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
      </div>

      {/* OEE by Machine */}
      <div className="card-industrial p-6">
        <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
          <Activity size={18} />
          {messages.oee.byMachine}
        </h3>
        <div className="space-y-5">
          {machines
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


