'use client';

import { useMachineStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Zap, Activity } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const EnergyPage = () => {
  const { machines, selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;

  const totalPowerNow = machines.reduce((sum, m) => sum + m.powerKw, 0);
  const peakPower = Math.max(...machines.map((m) => m.powerKw)) * 1.2;
  const totalEnergyToday = machines.reduce((sum, m) => sum + m.energyTodayKwh, 0);
  const totalEnergyMonth = machines.reduce((sum, m) => sum + m.energyMonthKwh, 0);
  const costPerKwh = 0.12;
  const costToday = totalEnergyToday * costPerKwh;
  const costMonth = totalEnergyMonth * costPerKwh;

  const pieChartOption = {
    tooltip: { trigger: 'item' },
    legend: { 
       type: 'scroll',
       bottom: 0,
       textStyle: { color: '#8fb3d9' },
       pageTextStyle: { color: '#8fb3d9' },
       pageIconColor: '#17a2b8'
    },
    series: [
      {
        name: selectedLanguage === 'en' ? 'Power kW' : 'Cng sut kW',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#0B213F',
          borderWidth: 2
        },
        label: { show: false },
        data: machines.map(m => ({ value: m.powerKw, name: m.code }))
      }
    ]
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Zap size={32} className="text-industrial-border" />
        <h1 className="text-2xl font-bold text-industrial-text">
          {messages.common.energy}
        </h1>
      </div>

      {/* Power KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.currentPowerKw}</p>
          <div className="flex items-end gap-2">
            <p className="metric-number text-industrial-success">{formatNumber(totalPowerNow, 1)}</p>
            <span className="text-industrial-success mb-1">kW</span>
          </div>
          <p className="text-xs text-industrial-text-secondary mt-2">{selectedLanguage === 'en' ? 'Current load' : 'Tải hiện tại'}</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.peakPowerToday}</p>
          <p className="metric-number text-industrial-warning">{formatNumber(peakPower, 1)}</p>
          <p className="text-xs text-industrial-text-secondary mt-2">{selectedLanguage === 'en' ? 'Peak capacity' : 'Công suất đỉnh'}</p>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.energyToday}</p>
           <div className="flex items-end gap-2">
            <p className="metric-number text-industrial-border">{formatNumber(totalEnergyToday, 1)}</p>
            <span className="text-industrial-text-secondary mb-1">kWh</span>
          </div>
        </div>
        <div className="card-industrial p-6">
          <p className="metric-label mb-2">{messages.energy.energyMonth}</p>
          <div className="flex items-end gap-2">
            <p className="metric-number text-industrial-text">{formatNumber(totalEnergyMonth, 0)}</p>
            <span className="text-industrial-text-secondary mb-1">kWh</span>
          </div>
        </div>
      </div>

      {/* Cost Analysis & Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-industrial p-6 flex flex-col">
          <h3 className="text-industrial-border font-semibold mb-4">
            {messages.energy.costAnalysis}
          </h3>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="bg-industrial-darker p-4 rounded-lg flex flex-col justify-center items-center text-center">
              <p className="text-sm text-industrial-text-secondary mb-1">{selectedLanguage === 'en' ? 'Today' : 'Hm nay'}</p>
              <p className="text-4xl font-bold text-industrial-border">${formatNumber(costToday, 2)}</p>
            </div>
            <div className="bg-industrial-darker p-4 rounded-lg flex flex-col justify-center items-center text-center">
              <p className="text-sm text-industrial-text-secondary mb-1">{selectedLanguage === 'en' ? 'This Month' : 'Thng ny'}</p>
              <p className="text-4xl font-bold text-industrial-success">${formatNumber(costMonth, 2)}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-industrial-border/20 mt-4">
            <p className="text-sm text-industrial-text-secondary flex justify-between">
              <span>{selectedLanguage === 'en' ? 'Cost per Unit (kWh)' : 'Gi m—i kWh'}</span>
              <span className="font-bold text-industrial-text">${costPerKwh}</span>
            </p>
          </div>
        </div>

        <div className="card-industrial p-6 flex flex-col">
           <h3 className="text-industrial-border font-semibold mb-2">
            {messages.energy.powerDistributionByMachine}
          </h3>
          <div className="flex-1 min-h-[280px] mt-2 relative">
            <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }} />
          </div>
        </div>
      </div>

      {/* Detail list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-industrial p-6">
          <h3 className="text-industrial-border font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} />
            {messages.energy.powerQuality}
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-industrial-text-secondary">Voltage</span>
                <span className="text-sm font-bold text-industrial-success">400.2 V</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div className="h-full bg-industrial-success rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-industrial-text-secondary">Frequency</span>
                <span className="text-sm font-bold text-industrial-success">50.1 Hz</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div className="h-full bg-industrial-success rounded-full" style={{ width: '99%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-industrial-text-secondary">Power Factor</span>
                <span className="text-sm font-bold text-industrial-warning">0.94</span>
              </div>
              <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/20">
                <div className="h-full bg-industrial-warning rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Power Distribution list */}
        <div className="card-industrial p-6">
          <h3 className="text-industrial-border font-semibold mb-4">
            {selectedLanguage === 'en' ? 'Machine Breakdown' : 'Chi tiết trạm máy'}
          </h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {machines.map((machine) => {
              const percentage = totalPowerNow > 0 ? (machine.powerKw / totalPowerNow) * 100 : 0;
              return (
                <div key={machine.id} className="bg-industrial-darker p-3 rounded-lg border border-industrial-border/10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-industrial-border/30">
                        <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-industrial-text">{machine.name}</p>
                        <p className="text-xs text-industrial-text-secondary">{machine.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-industrial-border">
                        {formatNumber(machine.powerKw, 1)} kW
                      </p>
                      <p className="text-xs text- промышлен-text-secondary">{formatNumber(percentage, 0)}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-industrial-card">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          machine.status === 'RUN'
                            ? '#22c55e'
                            : machine.status === 'FAULT'
                            ? '#ef4444'
                            : '#facc15',
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyPage;

