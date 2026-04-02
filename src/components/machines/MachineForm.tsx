'use client';

import React, { useState } from 'react';
import type { MachineConfigForm, MachineProfileResponse, MachineProtocol } from '@/types/machine-config';
import { VALID_PROTOCOLS, DEFAULT_PROTOCOL_PORTS } from '@/types/machine-config';
import { validateMachineConfig } from '@/lib/machine-config-normalizer';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface MachineFormProps {
  initialData?: Partial<MachineConfigForm>;
  profiles: MachineProfileResponse[];
  onSubmit: (data: MachineConfigForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MachineForm({ initialData, profiles, onSubmit, onCancel, isLoading = false }: MachineFormProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const validationMessages = {
    machineCodeRequired: t.validation.machineCodeRequired,
    machineCodeInvalid: t.validation.machineCodeInvalid,
    machineNameRequired: t.validation.machineNameRequired,
    protocolRequired: t.validation.protocolRequired,
    protocolInvalid: t.validation.protocolInvalid,
    hostRequired: t.validation.hostRequired,
    hostInvalid: t.validation.hostInvalid,
    portRange: t.validation.portRange,
    pollIntervalRange: t.validation.pollIntervalRange,
    profileRequired: t.validation.profileRequired,
  };

  const [formData, setFormData] = useState<MachineConfigForm>({
    machineCode: initialData?.machineCode || '',
    machineName: initialData?.machineName || '',
    description: initialData?.description || '',
    protocol: initialData?.protocol || '',
    host: initialData?.host || '',
    port: initialData?.port || '',
    unitId: initialData?.unitId || '',
    profileCode: initialData?.profileCode || '',
    pollIntervalMs: initialData?.pollIntervalMs || 1000,
    enabled: initialData?.enabled !== undefined ? initialData.enabled : true,
    autoConnect: initialData?.autoConnect !== undefined ? initialData.autoConnect : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = () => {
    const validation = validateMachineConfig(formData, validationMessages);
    const errorMap: Record<string, string> = {};
    validation.errors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);
    return validation.isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value ? parseInt(value, 10) : '') : value,
    }));

    // Clear error when user starts editing
    if (touched[name]) {
      const validation = validateMachineConfig({
        ...formData,
        [name]: type === 'checkbox' ? checked : type === 'number' ? (value ? parseInt(value, 10) : '') : value,
      }, validationMessages);
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((error) => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate on blur
    const validation = validateMachineConfig(formData, validationMessages);
    const errorMap: Record<string, string> = {};
    validation.errors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const protocol = e.target.value as MachineProtocol;
    setFormData((prev) => ({
      ...prev,
      protocol,
      port: DEFAULT_PROTOCOL_PORTS[protocol] || prev.port,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const getFieldError = (fieldName: string) => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nhóm 1: Thông tin cơ bản */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.form.basicInfo}</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.form.machineCode} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <input
              type="text"
              name="machineCode"
              value={formData.machineCode}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.exampleMachineCode}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                getFieldError('machineCode')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            />
            {getFieldError('machineCode') && <p className="text-xs text-red-500 mt-1">{getFieldError('machineCode')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.form.machineName} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <input
              type="text"
              name="machineName"
              value={formData.machineName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.exampleMachineName}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                getFieldError('machineName')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            />
            {getFieldError('machineName') && <p className="text-xs text-red-500 mt-1">{getFieldError('machineName')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.form.description}</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.exampleDescription}
              disabled={isLoading}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Nhóm 2: Kết nối PLC */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.form.plcConnection}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.table.protocol} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <select
              name="protocol"
              value={formData.protocol}
              onChange={handleProtocolChange}
              onBlur={handleBlur}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                getFieldError('protocol')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            >
              <option value="">{t.form.selectProtocol}</option>
              {VALID_PROTOCOLS.map((proto) => (
                <option key={proto} value={proto}>
                  {proto.toUpperCase()}
                </option>
              ))}
            </select>
            {getFieldError('protocol') && <p className="text-xs text-red-500 mt-1">{getFieldError('protocol')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.form.host} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <input
              type="text"
              name="host"
              value={formData.host}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.exampleHost}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                getFieldError('host')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            />
            {getFieldError('host') && <p className="text-xs text-red-500 mt-1">{getFieldError('host')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.table.port} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <input
              type="number"
              name="port"
              value={formData.port}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.examplePort}
              disabled={isLoading}
              min="1"
              max="65535"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                getFieldError('port')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            />
            {getFieldError('port') && <p className="text-xs text-red-500 mt-1">{getFieldError('port')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.form.unitId}</label>
            <input
              type="number"
              name="unitId"
              value={formData.unitId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.exampleUnitId}
              disabled={isLoading}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.form.pollInterval} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <input
              type="number"
              name="pollIntervalMs"
              value={formData.pollIntervalMs}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.form.examplePollInterval}
              disabled={isLoading}
              min="200"
              max="60000"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                getFieldError('pollIntervalMs')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            />
            {getFieldError('pollIntervalMs') && <p className="text-xs text-red-500 mt-1">{getFieldError('pollIntervalMs')}</p>}
          </div>
        </div>
      </div>

      {/* Nhóm 3: Mapping Profile */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.form.mappingProfile}</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.form.profile} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <select
              name="profileCode"
              value={formData.profileCode}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                getFieldError('profileCode')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            >
              <option value="">{t.form.selectProfile}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.code}>
                  {profile.name} ({profile.code})
                </option>
              ))}
            </select>
            {getFieldError('profileCode') && <p className="text-xs text-red-500 mt-1">{getFieldError('profileCode')}</p>}
          </div>
        </div>
      </div>

      {/* Nhóm 4: Cài đặt nâng cao */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.form.advancedSettings}</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled}
              onChange={handleChange}
              disabled={isLoading}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form.enabled}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="autoConnect"
              checked={formData.autoConnect}
              onChange={handleChange}
              disabled={isLoading}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form.autoConnect}</span>
          </label>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {t.actions.cancel}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? t.form.processing : t.actions.continue}
        </button>
      </div>
    </form>
  );
}

