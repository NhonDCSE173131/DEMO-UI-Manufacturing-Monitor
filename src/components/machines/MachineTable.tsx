'use client';

import React from 'react';
import { Zap, Wifi, WifiOff, MoreVertical, Trash2, Link as LinkIcon } from 'lucide-react';
import type { MachineConfigResponse } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface MachineTableProps {
  machines: MachineConfigResponse[];
  isLoading?: boolean;
  onEdit?: (machine: MachineConfigResponse) => void;
  onDelete?: (machineId: string) => void;
  onToggleEnabled?: (machine: MachineConfigResponse) => void;
  onTestConnection?: (machineId: string) => void;
  onConnect?: (machineId: string) => void;
  onDisconnect?: (machineId: string) => void;
}

export function MachineTable({
  machines,
  isLoading: _isLoading = false,
  onEdit,
  onDelete,
  onToggleEnabled,
  onTestConnection,
  onConnect,
  onDisconnect,
}: MachineTableProps) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const getConnectionStatusBadge = (status?: string) => {
    if (!status) return <span className="text-gray-500">{selectedLanguage === 'vi' ? 'Chua ket noi' : 'Not connected'}</span>;

    const statusLower = status.toLowerCase();
    if (statusLower === 'online') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
          <Wifi size={14} />
          {t.table.online}
        </span>
      );
    } else if (statusLower === 'offline') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100">
          <WifiOff size={14} />
          {t.table.offline}
        </span>
      );
    } else if (statusLower === 'stale') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100">STALE</span>;
    } else if (statusLower === 'unstable') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100">UNSTABLE</span>;
    } else if (statusLower === 'bad_config') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-100">BAD_CONFIG</span>;
    }

    return <span className="text-gray-500">{status}</span>;
  };

  if (machines.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
          <Zap size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.emptyTitle}</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t.emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.machineCode}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.machineName}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.protocol}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.host}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.port}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.profile}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.pollInterval}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.status}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.connection}</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => (
              <tr key={machine.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">{machine.machineCode}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-900 dark:text-white">{machine.machineName}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600 dark:text-gray-400">{machine.protocol.toUpperCase()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600 dark:text-gray-400">{machine.host}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600 dark:text-gray-400">{machine.port}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-gray-600 dark:text-gray-400">{machine.profileCode}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600 dark:text-gray-400">{machine.pollIntervalMs}ms</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${machine.enabled ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100'}`}>
                    {machine.enabled ? t.table.enabled : t.table.disabled}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getConnectionStatusBadge(machine.connectionStatus)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === machine.id ? null : machine.id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>

                    {openMenuId === machine.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                        <button
                          onClick={() => {
                            onEdit?.(machine);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t.actions.edit}
                        </button>

                        <button
                          onClick={() => {
                            onToggleEnabled?.(machine);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {machine.enabled ? (selectedLanguage === 'vi' ? 'Tat may' : 'Disable') : (selectedLanguage === 'vi' ? 'Bat may' : 'Enable')}
                        </button>

                        <button
                          onClick={() => {
                            onTestConnection?.(machine.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <LinkIcon size={14} />
                          {t.actions.testConnection}
                        </button>

                        {machine.connectionStatus !== 'ONLINE' ? (
                          <button
                            onClick={() => {
                              onConnect?.(machine.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2"
                          >
                            <Wifi size={14} />
                            {t.actions.connect}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onDisconnect?.(machine.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2"
                          >
                            <WifiOff size={14} />
                            {t.actions.disconnect}
                          </button>
                        )}

                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                        <button
                          onClick={() => {
                            onDelete?.(machine.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} />
                          {t.actions.delete}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

