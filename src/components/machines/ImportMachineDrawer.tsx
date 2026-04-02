'use client';

import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useMachineImport } from '@/hooks/useMachineImport';
import type { ImportMachineRow, ImportMode } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface ImportMachineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rows: ImportMachineRow[], mode: ImportMode, file: File) => Promise<void>;
  isLoading?: boolean;
}

type Step = 'upload' | 'preview' | 'confirm';

export function ImportMachineDrawer({ isOpen, onClose, onSubmit, isLoading = false }: ImportMachineDrawerProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('create-only');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { importRows, setImportRows, parseFile } = useMachineImport();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setSubmitError(null);

    // Parse file
    const result = await parseFile(selectedFile);

    if (result.errors.length > 0) {
      setSubmitError(result.errors.join('; '));
      return;
    }

    setImportRows(result.rows);
    setStep('preview');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-400');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-400');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-400');

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setFile(droppedFile);
    setSubmitError(null);

    const result = await parseFile(droppedFile);
    if (result.errors.length > 0) {
      setSubmitError(result.errors.join('; '));
      return;
    }

    setImportRows(result.rows);
    setStep('preview');
  };

  const handleContinue = () => {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setSubmitError(t.validation.noValidRows);
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setSubmitError(null);
      await onSubmit(importRows, importMode, file);
      setSuccessMessage(t.import.success);

      // Reset after 2 seconds
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setImportRows([]);
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      setSubmitError(message);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setImportRows([]);
    setSubmitError(null);
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  const validCount = importRows.filter((r) => r.isValid).length;
  const invalidCount = importRows.filter((r) => !r.isValid).length;
  const totalCount = importRows.length;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={handleClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-lg z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.drawer.importTitle}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step === 'upload' && t.drawer.importUploadDesc}
              {step === 'preview' && t.drawer.importPreviewDesc}
              {step === 'confirm' && t.drawer.importConfirmDesc}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
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

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center transition-colors cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t.import.dragDrop}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t.import.or}</p>
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer">
                  {t.actions.chooseFile}
                  <input type="file" accept=".csv,.json" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t.import.supportedFormats}</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>CSV</strong>: {t.import.csvHelp}</li>
                  <li>• <strong>JSON</strong>: {t.import.jsonHelp}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.import.totalRows}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{t.import.validRows}</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{validCount}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{t.import.invalidRows}</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{invalidCount}</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600">
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{t.import.rowNumber}</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{t.table.machineCode}</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{t.table.host}</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{t.table.protocol}</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{t.import.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 10).map((row) => (
                        <tr key={row.rowIndex} className="border-b border-gray-200 dark:border-gray-600">
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.rowIndex}</td>
                          <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">{row.machineCode}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.host}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.protocol}</td>
                          <td className="px-4 py-2">
                            {row.isValid ? (
                              <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs font-medium rounded">
                                {t.import.validRows}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 text-xs font-medium rounded">
                                {t.import.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalCount > 10 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {t.import.moreRows.replace('{{count}}', String(totalCount - 10))}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t.import.importMode}</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="importMode"
                      value="create-only"
                      checked={importMode === 'create-only'}
                      onChange={(e) => setImportMode(e.target.value as ImportMode)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.import.createOnly}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.import.createOnlyDesc}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="importMode"
                      value="upsert"
                      checked={importMode === 'upsert'}
                      onChange={(e) => setImportMode(e.target.value as ImportMode)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.import.upsert}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.import.upsertDesc}</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t.import.willImport
                    .replace('{{count}}', String(validCount))
                    .replace('{{mode}}', importMode === 'create-only' ? t.import.modeCreateOnly : t.import.modeUpsert)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {t.actions.cancel}
          </button>

          {step === 'upload' && <div className="flex-1" />}

          {step === 'preview' && (
            <button
              onClick={handleContinue}
              disabled={isLoading || validCount === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {t.actions.continue}
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? t.import.importing : t.actions.confirmImport}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

