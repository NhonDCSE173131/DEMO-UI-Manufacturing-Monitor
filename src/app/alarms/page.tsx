'use client';

import { useMachineStore } from '@/lib/store';
import { formatDateTime, getSeverityBgColor, getSeverityBorderColor } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const AlarmPage = () => {
  const { machines, events, selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

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

  const groupedEvents = events.reduce((acc: any, event) => {
    const machine = machines.find((m) => m.id === event.machineId);
    const machineKey = machine?.name || 'Unknown';
    if (!acc[machineKey]) {
      acc[machineKey] = [];
    }
    acc[machineKey].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.alarmsDowntime}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2">{selectedLanguage === 'en' ? 'Total Events' : 'Tổng số sự kiện'}</p>
          <div className="flex justify-between items-end">
            <p className="metric-number text-industrial-text">{events.length}</p>
            <Info size={24} className="text-industrial-info opacity-80" />
          </div>
        </div>
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2 text-industrial-error">{selectedLanguage === 'en' ? 'Critical Alerts' : 'Cảnh báo Nguy Hiểm'}</p>
          <div className="flex justify-between items-end">
            <p className="metric-number text-industrial-error">
              {events.filter((e) => e.severity === 'critical').length}
            </p>
             <AlertCircle size={24} className="text-industrial-error opacity-80" />
          </div>
        </div>
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2 text-industrial-warning">{selectedLanguage === 'en' ? 'Warnings' : 'Cảnh báo'}</p>
           <div className="flex justify-between items-end">
            <p className="metric-number text-industrial-warning">
              {events.filter((e) => e.severity === 'warning').length}
            </p>
            <AlertTriangle size={24} className="text-industrial-warning opacity-80" />
          </div>
        </div>
      </div>

      {/* Events by Machine */}
      <div className="space-y-4">
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
                          <p className="font-semibold text-industrial-text">{event.title}</p>
                          <span className="text-xs font-mono text-industrial-text-secondary whitespace-nowrap bg-industrial-bg px-2 py-1 rounded">
                            {formatDateTime(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-industrial-text-secondary mb-2 leading-relaxed">
                          {event.message}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs mt-2">
                          {event.cause && (
                            <p className="text-industrial-text-secondary bg-industrial-dark/50 px-2 py-1 rounded border border-industrial-border/10">
                              <strong className="text-industrial-text">{selectedLanguage === 'en' ? 'Cause' : 'Nguyên nhân'}:</strong> {event.cause}
                            </p>
                          )}
                          {event.durationMin && event.durationMin > 0 && (
                            <p className="text-industrial-text-secondary bg-industrial-dark/50 px-2 py-1 rounded border border-industrial-border/10">
                              <strong className="text-industrial-text">{selectedLanguage === 'en' ? 'Duration' : 'Thời gian'}:</strong> {event.durationMin} {selectedLanguage === 'en' ? 'minutes' : 'phút'}
                            </p>
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






