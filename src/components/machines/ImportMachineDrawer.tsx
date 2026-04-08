'use client';

import React, { useEffect, useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useMachineImport } from '@/hooks/useMachineImport';
import type { ImportEntityType, ImportExecutionSummary, MachineImportMode } from '@/types/machine-import';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface ImportMachineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: (type: ImportEntityType, result: ImportExecutionSummary) => Promise<void> | void;
  isLoading?: boolean;
  initialImportType?: ImportEntityType;
  lockImportType?: boolean;
  profileCount?: number;
  mappingFileCount?: number;
}

type Step = 'upload' | 'preview' | 'confirm';

export function ImportMachineDrawer({
  isOpen,
  onClose,
  onImported,
  isLoading = false,
  initialImportType = 'machines',
  lockImportType = false,
  profileCount = 0,
  mappingFileCount = 0,
}: ImportMachineDrawerProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportEntityType>(initialImportType);
  const [importMode, setImportMode] = useState<MachineImportMode>('CREATE_ONLY');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const missingProfiles = profileCount <= 0;
  const missingMappings = mappingFileCount <= 0;

  const {
    preview,
    setPreview,
    validationResult,
    setValidationResult,
    isLoading: hookLoading,
    parseFile,
    validateImport,
    submitImport,
  } = useMachineImport();

  useEffect(() => {
    setImportType(initialImportType);
  }, [initialImportType, isOpen]);

  useEffect(() => {
    if (lockImportType) return;
    if (importType === 'mappings' && missingProfiles) {
      setImportType('profiles');
      return;
    }
    if (importType === 'machines' && (missingProfiles || missingMappings)) {
      setImportType(missingProfiles ? 'profiles' : 'mappings');
    }
  }, [importType, lockImportType, missingMappings, missingProfiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setSubmitError(null);
    setValidationResult(null);

    const result = await parseFile(selectedFile, importType);
    if (result.errors.length > 0) {
      setSubmitError(result.errors.join('; '));
      return;
    }

    setPreview(result.preview);
    setStep('preview');
  };

  const handleValidate = async () => {
    if (!file) return;

    // Some BE versions only support MACHINE dry-run validation.
    if (importType !== 'machines') {
      setValidationResult({
        totalRows: preview?.totalRows || 0,
        validRows: preview?.totalRows || 0,
        invalidRows: 0,
        errors: [],
      });
      setInfoMessage(selectedLanguage === 'vi'
        ? 'Dry-run chi ho tro import may tren BE hien tai. Co the tiep tuc import.'
        : 'Dry-run is currently supported for machine import only. You can continue importing.');
      setStep('confirm');
      return;
    }

    try {
      setSubmitError(null);
      setInfoMessage(null);
      await validateImport(file, importType);
      setStep('confirm');
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      // Fallback to local preview summary when BE rejects import type for validate endpoint.
      if (message.toLowerCase().includes('unsupported import type')) {
        setValidationResult({
          totalRows: preview?.totalRows || 0,
          validRows: preview?.totalRows || 0,
          invalidRows: 0,
          errors: [],
        });
        setInfoMessage(selectedLanguage === 'vi'
          ? 'BE khong ho tro dry-run cho loai import nay. Da chuyen sang xac nhan import.'
          : 'Backend does not support dry-run for this import type. Switched to confirm import.');
        setStep('confirm');
        return;
      }
      setSubmitError(message);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setSubmitError(null);
      const result = await submitImport(file, importType, importMode);
      await onImported?.(importType, result);
      setSuccessMessage(t.import.success);

      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      setSubmitError(message);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setValidationResult(null);
    setSubmitError(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  const totalPreviewRows = preview?.totalRows || 0;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={handleClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-lg z-50 flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.drawer.importTitle}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step === 'upload' && (selectedLanguage === 'vi' ? 'Chon loai import va file CSV' : 'Choose import type and CSV file')}
              {step === 'preview' && (selectedLanguage === 'vi' ? 'Xem du lieu va goi validate dry-run' : 'Preview data and run dry-run validation')}
              {step === 'confirm' && (selectedLanguage === 'vi' ? 'Xac nhan import vao he thong' : 'Confirm import to system')}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900 dark:text-red-100">{submitError}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">{successMessage}</p>
            </div>
          )}

          {infoMessage && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{infoMessage}</p>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-5">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                {t.importFlow.bannerShort
                  .replace('{{profiles}}', String(profileCount))
                  .replace('{{mappings}}', String(mappingFileCount))}
              </div>

              {!lockImportType && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {selectedLanguage === 'vi' ? 'Loai import' : 'Import type'}
                </label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as ImportEntityType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="machines" disabled={missingProfiles || missingMappings}>Machines CSV</option>
                  <option value="profiles">Profiles CSV</option>
                  <option value="mappings" disabled={missingProfiles}>Mappings CSV</option>
                </select>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {missingProfiles
                    ? t.importFlow.needProfileBeforeMapping
                    : (missingMappings
                      ? t.importFlow.needMappingBeforeMachines
                      : t.importFlow.ready)}
                </p>
              </div>
              )}

              {importType === 'machines' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {selectedLanguage === 'vi' ? 'Che do import may' : 'Machine import mode'}
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as MachineImportMode)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="CREATE_ONLY">CREATE_ONLY</option>
                    <option value="UPSERT">UPSERT</option>
                  </select>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 text-center">
                <Upload size={32} className="mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedLanguage === 'vi' ? 'Chi ho tro file CSV' : 'CSV files only'}</p>
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer">
                  {t.actions.chooseFile}
                  <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.import.totalRows}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPreviewRows}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Headers</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{preview.headers.join(', ')}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="px-3 py-2 text-left sticky top-0 bg-gray-100 dark:bg-gray-700">#</th>
                        {preview.headers.map((header) => (
                          <th key={header} className="px-3 py-2 text-left sticky top-0 bg-gray-100 dark:bg-gray-700">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, index) => (
                        <tr key={`${index}-${row[0] || ''}`} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-2">{index + 1}</td>
                          {row.map((value, cellIndex) => (
                            <td key={`${index}-${cellIndex}`} className="px-3 py-2">{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'confirm' && validationResult && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                {selectedLanguage === 'vi'
                  ? 'Dry-run = backend kiem tra file truoc khi ghi vao DB (header, du lieu, quy tac). Neu dry-run hop le thi import that se an toan hon.'
                  : 'Dry-run means backend validates the file before writing to DB (headers, values, rules). If dry-run passes, real import is safer.'}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/40">
                  <p className="text-xs text-gray-500">{t.import.totalRows}</p>
                  <p className="text-xl font-semibold">{validationResult.totalRows}</p>
                </div>
                <div className="rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-green-700">{t.import.validRows}</p>
                  <p className="text-xl font-semibold text-green-800 dark:text-green-100">{validationResult.validRows}</p>
                </div>
                <div className="rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                  <p className="text-xs text-red-700">{t.import.invalidRows}</p>
                  <p className="text-xl font-semibold text-red-800 dark:text-red-100">{validationResult.invalidRows}</p>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 p-3 max-h-56 overflow-auto text-sm">
                  {validationResult.errors.map((error) => (
                    <p key={`${error.rowIndex}-${error.message}`} className="text-red-700 dark:text-red-300">
                      Row {error.rowIndex}: {error.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading || hookLoading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            {t.actions.cancel}
          </button>

          {step === 'preview' && (
            <button
              onClick={handleValidate}
              disabled={isLoading || hookLoading || !file}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {selectedLanguage === 'vi' ? 'Validate dry-run' : 'Validate dry-run'}
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleSubmit}
              disabled={isLoading || hookLoading || !file}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading || hookLoading ? t.import.importing : t.actions.confirmImport}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

