'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import type { CreateMachinePayload } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface MachineConfirmCardProps {
  data: CreateMachinePayload;
  onConfirm: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

export function MachineConfirmCard({ data, onConfirm, onEdit, isLoading = false }: MachineConfirmCardProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;
  const [isChecked, setIsChecked] = useState(false);

  const warnings: Array<{ type: string; message: string }> = [];

  // Kiểm tra cảnh báo
  if (data.pollIntervalMs < 500) {
    warnings.push({
      type: 'poll-interval',
      message: selectedLanguage === 'en'
        ? `Poll interval ${data.pollIntervalMs}ms is low and may increase system load`
        : `Poll interval ${data.pollIntervalMs}ms rất thấp, có thể tăng tải hệ thống`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.confirm.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t.confirm.subtitle}</p>
      </div>

      {/* Cảnh báo */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
          <div className="flex gap-3">
            <Zap size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">{t.confirm.warningTitle}</h3>
              <ul className="space-y-1">
                {warnings.map((w) => (
                  <li key={w.type} className="text-sm text-amber-800 dark:text-amber-200">
                    • {w.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bảng dữ liệu */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="grid grid-cols-2 gap-0">
            <div className="p-4 bg-gray-100 dark:bg-gray-700/50">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.table.machineCode}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{data.machineCode}</p>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-gray-700/50">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.table.machineName}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{data.machineName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.table.protocol}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{data.protocol.toUpperCase()}</p>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.form.host}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{data.host}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.table.port}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{data.port}</p>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.form.unitId}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{data.unitId || '-'}</p>
            </div>
          </div>

           <div className="grid grid-cols-2 gap-0">
             <div className="p-4">
               <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.table.profile}</p>
               <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{data.profileCode || data.profileId}</p>
             </div>
             <div className="p-4">
               <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mapping File</p>
               <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{data.mappingFileId ? `✓ Selected` : 'Default'}</p>
             </div>
           </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.confirm.autoConnect}</p>
              <p className="text-base font-medium mt-1">
                <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${data.autoConnect ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100'}`}>
                  {data.autoConnect ? t.confirm.yes : t.confirm.no}
                </span>
              </p>
            </div>
            <div className="p-4" />
          </div>

          {data.description && (
            <div className="p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.form.description}</p>
              <p className="text-base text-gray-900 dark:text-white mt-1">{data.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Checkbox xác nhận */}
      <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          disabled={isLoading}
          className="w-5 h-5 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-white">{t.confirm.confirmDataTitle}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t.confirm.confirmDataDesc}
          </p>
        </div>
      </label>

      {/* Nút hành động */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onEdit}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {t.actions.backToEdit}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isChecked || isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? t.form.processing : t.actions.confirmAddMachine}
        </button>
      </div>
    </div>
  );
}

