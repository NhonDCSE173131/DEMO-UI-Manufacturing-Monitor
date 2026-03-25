'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Wrench, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { useState } from 'react';

const ToolsPage = () => {
  const { machines, tools, selectedLanguage, replaceTool } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const [replacingToolId, setReplacingToolId] = useState<string | null>(null);
  const [maintainerName, setMaintainerName] = useState('');
  const [maintenanceTime, setMaintenanceTime] = useState(new Date().toISOString().slice(0, 16));
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const getToolMachineName = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.name || 'Unknown';
  };

  const getToolMachineImage = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.image || '';
  };

  const criticalTools = tools.filter((t) => t.remainingLifePct <= 20);
  const warningTools = tools.filter((t) => t.remainingLifePct > 20 && t.remainingLifePct <= 50);
  const healthyTools = tools.filter((t) => t.remainingLifePct > 50);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Wrench size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.toolLife}
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2">{selectedLanguage === 'en' ? 'Total Tools' : 'Tổng số dao cụ'}</p>
          <div className="flex justify-between items-end">
            <p className="metric-number">{tools.length}</p>
            <Wrench size={24} className="text-industrial-border opacity-50" />
          </div>
        </div>
        <div className="card-industrial p-6 border-industrial-error/50 flex flex-col justify-between bg-industrial-error/5">
          <p className="metric-label mb-2 text-industrial-error">{selectedLanguage === 'en' ? 'Critical' : 'Nguy Hiểm'}</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="metric-number text-industrial-error">{criticalTools.length}</p>
              <p className="text-xs text-industrial-error mt-2 opacity-80">{selectedLanguage === 'en' ? 'Need replacement soon' : 'Cần thay thế ngay'}</p>
            </div>
             <AlertCircle size={24} className="text-industrial-error opacity-80" />
          </div>
        </div>
        <div className="card-industrial p-6 flex flex-col justify-between">
          <p className="metric-label mb-2 text-industrial-success">{selectedLanguage === 'en' ? 'Healthy' : 'Tốt'}</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="metric-number text-industrial-success">{healthyTools.length}</p>
              <p className="text-xs text-industrial-success mt-2 opacity-80">{selectedLanguage === 'en' ? 'Good condition' : 'Tình trạng còn tốt'}</p>
            </div>
             <CheckCircle size={24} className="text-industrial-success opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* Critical Tools */}
          {criticalTools.length > 0 && (
            <div className="card-industrial p-6 border-industrial-error/50 bg-industrial-error/5">
              <h3 className="text-industrial-error font-semibold mb-4 flex items-center gap-2">
                <AlertCircle size={18} />
                {selectedLanguage === 'en' ? 'Tools Needing Immediate Replacement' : 'Dao cụ cần thay thế khẩn cấp'}
              </h3>
              <div className="space-y-3">
                {criticalTools.map((tool) => (
                  <div key={tool.id} className="p-4 bg-industrial-darker rounded-lg border border-industrial-error/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full border border-industrial-border/30 overflow-hidden shrink-0">
                          <img src={getToolMachineImage(tool.machineId)} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <div>
                          <p className="font-semibold text-industrial-text">{tool.name}</p>
                          <p className="text-xs text-industrial-text-secondary">
                            {getToolMachineName(tool.machineId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-lg font-bold text-industrial-error animate-pulse">
                          {tool.remainingLifePct}%
                        </span>
                        <button 
                          onClick={() => {
                             setReplacingToolId(tool.id);
                             setMaintenanceTime(new Date().toISOString().slice(0, 16));
                          }}
                          className="px-3 py-1 bg-industrial-error/20 hover:bg-industrial-error/40 text-industrial-error text-xs rounded border border-industrial-error/30 transition-colors whitespace-nowrap"
                        >
                          {selectedLanguage === 'en' ? 'Confirm Replacement' : 'Xác nhận thay dao'}
                        </button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-industrial-card border border-industrial-error/30 overflow-hidden mt-3">
                      <div
                        className="h-full bg-industrial-error rounded-full transition-all"
                        style={{ width: `${tool.remainingLifePct}%` }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-industrial-bg/50 p-2 rounded">
                      <div>
                        <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Parts Left' : 'Part Khả dụng'}</p>
                        <p className="font-semibold text-industrial-error">
                          {tool.estimatedPartsRemaining}
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Hours Left' : 'Giờ Khả dụng'}</p>
                        <p className="font-semibold text-industrial-error">
                          {formatNumber(tool.estimatedHoursRemaining, 1)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Used' : 'Đã Dùng'}</p>
                        <p className="font-semibold">{formatNumber(tool.usageTimeHours, 1)}h</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Tools */}
          {warningTools.length > 0 && (
            <div className="card-industrial p-6 border-industrial-warning/50 bg-industrial-warning/5">
              <h3 className="text-industrial-warning font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                {selectedLanguage === 'en' ? 'Tools Under Monitoring' : 'Dao cụ đang theo dõi'}
              </h3>
              <div className="space-y-3">
                {warningTools.map((tool) => (
                  <div key={tool.id} className="p-4 bg-industrial-darker rounded-lg border border-industrial-warning/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full border border-industrial-border/30 overflow-hidden shrink-0">
                          <img src={getToolMachineImage(tool.machineId)} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <div>
                          <p className="font-semibold text-industrial-text">{tool.name}</p>
                          <p className="text-xs text-industrial-text-secondary">
                            {getToolMachineName(tool.machineId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-bold text-industrial-warning">
                          {tool.remainingLifePct}%
                        </span>
                        <button 
                          onClick={() => {
                             setReplacingToolId(tool.id);
                             setMaintenanceTime(new Date().toISOString().slice(0, 16));
                          }}
                          className="px-2 py-1 bg-industrial-warning/10 hover:bg-industrial-warning/30 text-industrial-warning text-xs rounded border border-industrial-warning/30 transition-colors whitespace-nowrap"
                        >
                          {selectedLanguage === 'en' ? 'Replaced' : 'Đã thay'}
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 mt-2 rounded-full bg-industrial-card border border-industrial-warning/30 overflow-hidden">
                      <div
                        className="h-full bg-industrial-warning rounded-full transition-all"
                        style={{ width: `${tool.remainingLifePct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Healthy Tools */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-success font-semibold mb-4 flex items-center gap-2">
              <CheckCircle size={18} />
              {selectedLanguage === 'en' ? 'Healthy Tools' : 'Dao cụ trạng thái tốt'}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {healthyTools.map((tool) => (
                <div key={tool.id} className="p-3 bg-industrial-darker rounded-lg border border-industrial-success/30 hover:bg-industrial-card transition-colors">
                  <div className="flex items-center justify-between">
                     <div className="flex gap-3 items-center">
                        <div className="w-6 h-6 rounded-full border border-industrial-border/30 overflow-hidden shrink-0">
                          <img src={getToolMachineImage(tool.machineId)} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-industrial-text">{tool.name}</p>
                          <p className="text-xs text-industrial-text-secondary">
                            {getToolMachineName(tool.machineId)}
                          </p>
                        </div>
                      </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-industrial-success bg-industrial-success/10 px-2 py-1 rounded">
                        {tool.remainingLifePct}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Replacement History */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-4">
              {messages.toolLife?.replacementHistory || (selectedLanguage === 'en' ? 'Maintenance History' : 'Lịch sử thay thế')}
            </h3>
            <div className="space-y-2">
              {tools.map((tool) => (
                <div key={tool.id} className="p-3 text-sm text-industrial-text-secondary border-b border-industrial-border/10 hover:bg-industrial-darker hover:text-industrial-text transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="opacity-50"/>
                      <span>{tool.name}</span>
                    </div>
                    <span className="font-mono text-xs bg-industrial-bg px-2 py-1 rounded">{tool.lastReplacedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tool Replacement Modal */}
      {replacingToolId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setReplacingToolId(null)}>
          <div className="bg-[#1e1e1e] border border-industrial-border/30 rounded-xl shadow-2xl w-[90vw] max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-industrial-border/20 bg-industrial-darker">
              <h2 className="text-lg font-semibold text-industrial-text flex items-center gap-2">
                 <Wrench size={20} className="text-industrial-border" />
                 {selectedLanguage === 'en' ? 'Confirm Tool Replacement' : 'Xác nhận thay dao'}
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setReplacingToolId(null)}>
                 <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm text-industrial-text-secondary mb-1">
                     {selectedLanguage === 'en' ? 'Maintainer Name' : 'Tên người thay thế'}
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
                     {selectedLanguage === 'en' ? 'Replacement Time' : 'Thời gian thay'}
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
               <button onClick={() => setReplacingToolId(null)} className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                  {selectedLanguage === 'en' ? 'Cancel' : 'Huỷ'}
               </button>
               <button 
                  onClick={() => {
                     if (!maintainerName.trim()) {
                        alert(selectedLanguage === 'en' ? 'Please enter a name.' : 'Vui lòng nhập tên.');
                        return;
                     }
                     replaceTool(replacingToolId, {
                        maintainer: maintainerName,
                        timestamp: new Date(maintenanceTime).toISOString(),
                        notes: maintenanceNotes
                     });
                     setReplacingToolId(null);
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

export default ToolsPage;

