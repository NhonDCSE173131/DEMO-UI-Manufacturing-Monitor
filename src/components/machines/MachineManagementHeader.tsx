'use client';

import React from 'react';
import { Plus, Upload } from 'lucide-react';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface MachineManagementHeaderProps {
  onAddMachine: () => void;
  onImportConfig: () => void;
  isLoading?: boolean;
}

export function MachineManagementHeader({
  onAddMachine,
  onImportConfig,
  isLoading = false,
}: MachineManagementHeaderProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>
        <div className="flex gap-3">
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
    </div>
  );
}

