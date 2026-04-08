'use client';

import React, { useEffect, useState } from 'react';
import type { CreateMachineProfilePayload, MachineConfigForm, MachineProfileResponse, MachineProtocol } from '@/types/machine-config';
import { VALID_PROTOCOLS, DEFAULT_PROTOCOL_PORTS } from '@/types/machine-config';
import { validateMachineConfig } from '@/lib/machine-config-normalizer';
import { useMappingFiles } from '@/hooks/useMappingFiles';
import { validateProfileMapping } from '@/lib/api/validate-profile-mapping';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface MachineFormProps {
  initialData?: Partial<MachineConfigForm>;
  preferredProfileId?: string;
  profiles: MachineProfileResponse[];
  profileCount?: number;
  mappingFileCount?: number;
  onOpenImportProfile?: () => void;
  onOpenImportMapping?: () => void;
  onCreateProfile?: (payload: CreateMachineProfilePayload) => Promise<MachineProfileResponse | void>;
  onSubmit: (data: MachineConfigForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MachineForm({
  initialData,
  preferredProfileId,
  profiles,
  profileCount = 0,
  mappingFileCount = 0,
  onOpenImportProfile,
  onOpenImportMapping,
  onCreateProfile,
  onSubmit,
  onCancel,
  isLoading = false,
}: MachineFormProps) {
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
    profileId: initialData?.profileId || '',
    mappingFileId: initialData?.mappingFileId || '',
    pollIntervalMs: initialData?.pollIntervalMs || 1000,
    autoConnect: initialData?.autoConnect !== undefined ? initialData.autoConnect : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showQuickCreateProfile, setShowQuickCreateProfile] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileCreateError, setProfileCreateError] = useState<string | null>(null);
  const [mappingValidationError, setMappingValidationError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    profileCode: '',
    profileName: '',
    vendor: '',
    model: '',
    description: '',
  });

  const selectedProfile = profiles.find((profile) => profile.id === formData.profileId);

  const { files: mappingFiles, isLoading: isLoadingMappingFiles } = useMappingFiles();
  const selectableMappingFiles = mappingFiles.filter(
    (file) => file.status === 'COMPLETED' || file.status === 'COMPLETED_WITH_ERRORS',
  );

  useEffect(() => {
    if (!preferredProfileId) return;
    setFormData((prev) => {
      if (prev.profileId) return prev;
      return { ...prev, profileId: preferredProfileId };
    });
  }, [preferredProfileId]);

  useEffect(() => {
    if (!formData.mappingFileId) return;
    const exists = selectableMappingFiles.some((file) => file.fileId === formData.mappingFileId);
    if (!exists) {
      setFormData((prev) => ({ ...prev, mappingFileId: '' }));
      setMappingValidationError(null);
    }
  }, [formData.mappingFileId, selectableMappingFiles]);

  const buildErrors = (data: MachineConfigForm) => {
    const validation = validateMachineConfig(data, validationMessages);
    const errorMap: Record<string, string> = {};
    validation.errors.forEach((error) => {
      errorMap[error.field] = error.message;
    });

    if (!data.mappingFileId || data.mappingFileId.trim() === '') {
      errorMap.mappingFileId = selectedLanguage === 'vi' ? 'Mapping khong duoc de trong' : 'Mapping is required';
    }

    return {
      isValid: Object.keys(errorMap).length === 0,
      errorMap,
    };
  };

  const validateForm = () => {
    const { isValid, errorMap } = buildErrors(formData);
    setErrors(errorMap);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    const normalizedValue = type === 'checkbox' ? checked : type === 'number' ? (value ? parseInt(value, 10) : '') : value;
    const nextFormData = {
      ...formData,
      [name]: normalizedValue,
    } as MachineConfigForm;

    // Validate mapping-file/profile pair when both are selected.
    if (name === 'mappingFileId' && value && formData.profileId) {
      void validateMappingFileSelection(formData.profileId, value);
    }

    if (name === 'profileId' && value && formData.mappingFileId) {
      void validateMappingFileSelection(value, formData.mappingFileId);
    }

    setFormData(nextFormData);

    // Clear error when user starts editing
    if (touched[name]) {
      const { errorMap } = buildErrors(nextFormData);
      setErrors(errorMap);
    }
  };

  const validateMappingFileSelection = async (profileId: string, mappingFileId: string) => {
    try {
      setMappingValidationError(null);
      const result = await validateProfileMapping({
        profileId,
        mappingFileId,
      });

      if (!result.valid) {
        setMappingValidationError(result.error || (selectedLanguage === 'vi'
          ? 'Mapping file chua san sang hoac khong hop le'
          : 'Mapping file is not ready or invalid'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation error';
      setMappingValidationError(message);
    }
  };

  useEffect(() => {
    if (!formData.profileId || !formData.mappingFileId) {
      setMappingValidationError(null);
      return;
    }
    void validateMappingFileSelection(formData.profileId, formData.mappingFileId);
  }, [formData.profileId, formData.mappingFileId]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate on blur
    const { errorMap } = buildErrors(formData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.profileId && formData.mappingFileId) {
      const result = await validateProfileMapping({
        profileId: formData.profileId,
        mappingFileId: formData.mappingFileId,
      });
      if (!result.valid) {
        setMappingValidationError(result.error || (selectedLanguage === 'vi'
          ? 'Mapping file chua san sang hoac khong hop le'
          : 'Mapping file is not ready or invalid'));
        return;
      }
    }

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const getFieldError = (fieldName: string) => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  };

  const handleCreateProfile = async () => {
    if (!onCreateProfile) return;
    if (!profileForm.profileCode.trim() || !profileForm.profileName.trim()) {
      setProfileCreateError(selectedLanguage === 'vi' ? 'Can nhap profile code va profile name' : 'Profile code and profile name are required');
      return;
    }

    try {
      setIsCreatingProfile(true);
      setProfileCreateError(null);
      const created = await onCreateProfile({
        profileCode: profileForm.profileCode.trim().toUpperCase(),
        profileName: profileForm.profileName.trim(),
        protocol: 'modbus-tcp',
        vendor: profileForm.vendor.trim() || undefined,
        model: profileForm.model.trim() || undefined,
        description: profileForm.description.trim() || undefined,
      });

      if (created?.id) {
        setFormData((prev) => ({ ...prev, profileId: created.id }));
      }

      setProfileForm({
        profileCode: '',
        profileName: '',
        vendor: '',
        model: '',
        description: '',
      });
      setShowQuickCreateProfile(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      setProfileCreateError(message);
    } finally {
      setIsCreatingProfile(false);
    }
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

      {/* Nhóm 3: Profile & Mapping config */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.form.mappingProfile}</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
              {t.importFlow.bannerShort
                .replace('{{profiles}}', String(profileCount))
                .replace('{{mappings}}', String(mappingFileCount))}
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.form.profile} <span className="text-red-500">{t.form.requiredMark}</span>
            </label>
            <select
              name="profileId"
              value={formData.profileId}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                getFieldError('profileId')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
            >
              <option value="">{t.form.selectProfile}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.profileName} ({profile.profileCode})
                </option>
              ))}
            </select>
            {getFieldError('profileId') && <p className="text-xs text-red-500 mt-1">{getFieldError('profileId')}</p>}
            {selectedProfile && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                <span>{selectedLanguage === 'vi' ? 'Profile da chon:' : 'Profile selected:'}</span>
                <span className="font-semibold">{selectedProfile.profileName}</span>
                <span>({selectedProfile.profileCode})</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {onOpenImportProfile && (
                <button
                  type="button"
                  onClick={onOpenImportProfile}
                  className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700"
                >
                  {selectedLanguage === 'vi' ? 'Import profile (xem truoc)' : 'Import profile (preview)'}
                </button>
              )}

              {onCreateProfile && (
                <button
                  type="button"
                  onClick={() => setShowQuickCreateProfile((prev) => !prev)}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  {showQuickCreateProfile
                    ? (selectedLanguage === 'vi' ? 'Dong tao nhanh' : 'Close quick add')
                    : (selectedLanguage === 'vi' ? 'Them nhanh profile' : 'Quick add profile')}
                </button>
              )}
            </div>

            {showQuickCreateProfile && onCreateProfile && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                <input
                  value={profileForm.profileCode}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, profileCode: e.target.value }))}
                  placeholder={selectedLanguage === 'vi' ? 'Profile Code (VD: EASY521_STD)' : 'Profile Code (e.g. EASY521_STD)'}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
                <input
                  value={profileForm.profileName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, profileName: e.target.value }))}
                  placeholder={selectedLanguage === 'vi' ? 'Profile Name' : 'Profile Name'}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
                <input
                  value={profileForm.vendor}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, vendor: e.target.value }))}
                  placeholder={selectedLanguage === 'vi' ? 'Vendor (tuỳ chọn)' : 'Vendor (optional)'}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
                <input
                  value={profileForm.model}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder={selectedLanguage === 'vi' ? 'Model (tuỳ chọn)' : 'Model (optional)'}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
                <textarea
                  value={profileForm.description}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={selectedLanguage === 'vi' ? 'Mo ta profile (tuỳ chọn)' : 'Profile description (optional)'}
                  rows={2}
                  className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
                {profileCreateError && (
                  <p className="md:col-span-2 text-xs text-red-500">{profileCreateError}</p>
                )}
                <button
                  type="button"
                  onClick={handleCreateProfile}
                  disabled={isCreatingProfile}
                  className="md:col-span-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingProfile ? (selectedLanguage === 'vi' ? 'Dang tao profile...' : 'Creating profile...') : (selectedLanguage === 'vi' ? 'Tao profile nhanh' : 'Create profile now')}
                </button>
              </div>
            )}

            {onOpenImportMapping && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onOpenImportMapping}
                  disabled={profileCount <= 0}
                  className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedLanguage === 'vi' ? 'Import mapping (xem truoc)' : 'Import mapping (preview)'}
                </button>
                {profileCount <= 0 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                    {t.importFlow.needProfileBeforeMapping}
                  </p>
                )}
              </div>
            )}

            {/* Mapping File Selector */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {selectedLanguage === 'vi' ? 'File Mapping da Import' : 'Imported Mapping File'} <span className="text-red-500">{t.form.requiredMark}</span>
              </label>
              <select
                name="mappingFileId"
                value={formData.mappingFileId}
                onChange={handleChange}
                onBlur={handleBlur}
                  disabled={isLoading || isLoadingMappingFiles || selectableMappingFiles.length === 0}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  getFieldError('mappingFileId') || mappingValidationError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
              >
                <option value="">
                    {selectedLanguage === 'vi' ? 'Chon file mapping da import...' : 'Select imported mapping file...'}
                </option>
                  {[...selectableMappingFiles]
                  .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())
                  .map((file) => (
                    <option key={file.fileId} value={file.fileId}>
                      {file.fileName} | {file.profileCode || '-'} | {file.status} | {file.successRows}/{file.failedRows} | {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '-'}
                    </option>
                  ))}
              </select>
              {getFieldError('mappingFileId') && <p className="mt-1 text-xs text-red-500">{getFieldError('mappingFileId')}</p>}
              {mappingValidationError && <p className="mt-1 text-xs text-red-500">{mappingValidationError}</p>}
              {formData.mappingFileId && !mappingValidationError && formData.profileId && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">
                  {selectedLanguage === 'vi' ? '✓ Profile va mapping hop le' : '✓ Profile and mapping pair is valid'}
                </p>
              )}
            </div>
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

