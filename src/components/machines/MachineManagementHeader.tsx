'use client';

import React from 'react';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface MachineManagementHeaderProps {
  onAddMachine: () => void;
  onImportConfig: () => void;
  onRefresh: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  protocolFilter: 'all' | 'modbus-tcp';
  onProtocolFilterChange: (value: 'all' | 'modbus-tcp') => void;
  isLoading?: boolean;
}

export function MachineManagementHeader({
  onAddMachine,
  onImportConfig,
  onRefresh,
  searchValue,
  onSearchChange,
  protocolFilter,
  onProtocolFilterChange,
  isLoading = false,
}: MachineManagementHeaderProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={18} />
            <span>{selectedLanguage === 'vi' ? 'Lam moi' : 'Refresh'}</span>
          </button>
          <button
            onClick={onImportConfig}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload size={18} />
            <span>{t.importConfig}</span>
          </button>
          <button
            onClick={onAddMachine}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            <span>{t.addMachine}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={selectedLanguage === 'vi' ? 'Tim theo ma/ten may' : 'Search by machine code/name'}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        />
        <select
          value={protocolFilter}
          onChange={(e) => onProtocolFilterChange(e.target.value as 'all' | 'modbus-tcp')}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        >
          <option value="all">{selectedLanguage === 'vi' ? 'Tat ca protocol' : 'All protocols'}</option>
          <option value="modbus-tcp">modbus-tcp</option>
        </select>
      </div>
    </div>
  );
}

