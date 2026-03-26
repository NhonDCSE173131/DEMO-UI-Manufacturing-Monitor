'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Wrench, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { useMemo, useState } from 'react';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { getTimeRangeConfig } from '@/lib/time-range-config';

const ToolsPage = () => {
  const { machines, tools, selectedLanguage, replaceTool } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const [replacingToolId, setReplacingToolId] = useState<string | null>(null);
  const [maintainerName, setMaintainerName] = useState('');
  const [maintenanceTime, setMaintenanceTime] = useState(new Date().toISOString().slice(0, 16));
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [healthRange, setHealthRange] = useState<TimeRange>('1h');
  const [wearRange, setWearRange] = useState<TimeRange>('1h');

  const getToolMachineName = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.name || (selectedLanguage === 'en' ? 'Unknown' : 'Không rõ');
  };

  const getToolMachineImage = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.image || '';
  };

  const criticalTools = tools.filter((t) => t.remainingLifePct <= 20);
  const warningTools = tools.filter((t) => t.remainingLifePct > 20 && t.remainingLifePct <= 50);
  const healthyTools = tools.filter((t) => t.remainingLifePct > 50);

  const getWearWindow = (trend: number[], range: TimeRange) => {
    const points = Math.max(3, Math.min(getTimeRangeConfig(range).pointCount, trend.length));
    return trend.slice(trend.length - points);
  };

  const topToolsForHealthPanel = useMemo(
    () => tools.slice(0, 3),
    [tools],
  );

  const buildWearTrendOption = (toolName: string, data: number[]) => ({
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '3%', top: '15%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((_, idx) => `T${idx + 1}`),
      axisLabel: { color: '#8fb3d9', fontSize: 10 },
      axisLine: { lineStyle: { color: '#28445f' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#8fb3d9', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1a2a3a' } },
    },
    series: [
      {
        name: toolName,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#17a2b8', width: 2 },
        itemStyle: { color: '#17a2b8' },
      },
    ],
  });

  const buildLifeGauge = (value: number) => ({
    series: [
      {
        type: 'pie',
        radius: ['72%', '92%'],
        center: ['50%', '50%'],
        silent: true,
        label: { show: false },
        data: [
          {
            value,
            itemStyle: {
              color: value <= 20 ? '#ef4444' : value <= 50 ? '#facc15' : '#22c55e',
            },
          },
          { value: Math.max(0, 100 - value), itemStyle: { color: 'rgba(143,179,217,0.18)' } },
        ],
      },
    ],
  });

  return (
    <div className="space-y-6 animate-fade-in">
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
          <p className="metric-label mb-2 text-industrial-error">{selectedLanguage === 'en' ? 'Critical' : 'Nghiêm trọng'}</p>
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

      <div className="card-industrial p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="panel-title">{selectedLanguage === 'en' ? 'Observed vs Predicted Tool Health' : 'So sánh dữ liệu quan sát và dự đoán dao cụ'}</h3>
          <TimeRangeSelector value={healthRange} onChange={setHealthRange} showLabel={false} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {topToolsForHealthPanel.map((tool) => {
            const machine = machines.find((m) => m.id === tool.machineId);
            const observedLoad = machine?.rawTelemetry?.servoLoadPct ?? machine?.spindleLoadPct ?? 0;
            const observedVibration = machine?.rawTelemetry?.vibrationPct ?? machine?.vibrationPct ?? 0;
            const trendWindow = getWearWindow(tool.wearTrend, healthRange);
            const trendAverage = trendWindow.length > 0 ? trendWindow.reduce((sum, point) => sum + point, 0) / trendWindow.length : tool.remainingLifePct;
            const predictedLife = machine?.predictions?.remainingToolLifePct ?? Math.round(trendAverage);

            return (
              <div key={`overview-${tool.id}`} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-industrial-text line-clamp-1">{tool.name}</p>
                    <p className="text-xs text-industrial-text-secondary">{getToolMachineName(tool.machineId)}</p>
                  </div>
                  <div className="w-16 h-16">
                    <ReactECharts option={buildLifeGauge(predictedLife)} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-industrial-bg/50 border border-industrial-border/10 rounded p-2">
                    <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Observed load' : 'Tải quan sát'}</p>
                    <p className="font-semibold text-industrial-text">{formatNumber(observedLoad, 0)}%</p>
                  </div>
                  <div className="bg-industrial-bg/50 border border-industrial-border/10 rounded p-2">
                    <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Observed vibration' : 'Độ rung quan sát'}</p>
                    <p className="font-semibold text-industrial-text">{formatNumber(observedVibration, 0)}%</p>
                  </div>
                  <div className="bg-industrial-bg/50 border border-industrial-border/10 rounded p-2 col-span-2">
                    <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Predicted life' : 'Tuổi thọ dự đoán'}</p>
                    <p className={`font-semibold ${predictedLife <= 20 ? 'text-industrial-error' : predictedLife <= 50 ? 'text-industrial-warning' : 'text-industrial-success'}`}>{formatNumber(predictedLife, 0)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="panel-title">{selectedLanguage === 'en' ? 'Wear Trend (Critical + Warning)' : 'Xu hướng mòn dao (cảnh báo + nghiêm trọng)'}</h3>
            <TimeRangeSelector value={wearRange} onChange={setWearRange} showLabel={false} />
          </div>
          <div className="space-y-4">
            {[...criticalTools, ...warningTools].slice(0, 3).map((tool) => (
              <div key={`trend-${tool.id}`} className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-industrial-text">{tool.name}</p>
                  <span className={`text-xs px-2 py-1 rounded border ${tool.remainingLifePct <= 20 ? 'text-industrial-error border-industrial-error/30 bg-industrial-error/10' : 'text-industrial-warning border-industrial-warning/30 bg-industrial-warning/10'}`}>
                    {tool.remainingLifePct}%
                  </span>
                </div>
                <div className="h-40">
                  <ReactECharts option={buildWearTrendOption(tool.name, getWearWindow(tool.wearTrend, wearRange))} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            ))}
          </div>
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
                        <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Parts Left' : 'Số part còn lại'}</p>
                        <p className="font-semibold text-industrial-error">
                          {tool.estimatedPartsRemaining}
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Hours Left' : 'Giờ còn lại'}</p>
                        <p className="font-semibold text-industrial-error">
                          {formatNumber(tool.estimatedHoursRemaining, 1)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Used' : 'Đã dùng'}</p>
                        <p className="font-semibold">{formatNumber(tool.usageTimeHours, 1)}h</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 rounded bg-industrial-error/10 border border-industrial-error/20 text-xs text-industrial-error">
                      {selectedLanguage === 'en' ? 'Recommended action: replace now, verify vibration trend, then resume at reduced load.' : 'Khuyến nghị: thay ngay, kiểm tra xu hướng rung, sau đó chạy lại với tải giảm.'}
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
                    <p className="text-xs text-industrial-text-secondary mt-2">
                      {selectedLanguage === 'en' ? 'Prediction: monitor wear trend and prepare replacement kit.' : 'Dự đoán: theo dõi xu hướng mòn và chuẩn bị bộ thay thế.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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

