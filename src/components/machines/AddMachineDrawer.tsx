'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MachineForm } from './MachineForm';
import { MachineConfirmCard } from './MachineConfirmCard';
import { normalizeMachineConfigInput } from '@/lib/machine-config-normalizer';
import type { MachineConfigForm, CreateMachinePayload, MachineProfileResponse } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

type Step = 'form' | 'confirm';

interface AddMachineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMachinePayload) => Promise<void>;
  profiles: MachineProfileResponse[];
  isLoading?: boolean;
}

export function AddMachineDrawer({ isOpen, onClose, onSubmit, profiles, isLoading = false }: AddMachineDrawerProps) {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;
  const [step, setStep] = useState<Step>('form');
  const [normalizedData, setNormalizedData] = useState<CreateMachinePayload | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFormSubmit = (data: MachineConfigForm) => {
    const normalized = normalizeMachineConfigInput(data);
    setNormalizedData(normalized);
    setSubmitError(null);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!normalizedData) return;

    try {
      setSubmitError(null);
      await onSubmit(normalizedData);
      // Reset state after successful submission
      setStep('form');
      setNormalizedData(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.createMachineFailed;
      setSubmitError(message);
    }
  };

  const handleEdit = () => {
    setStep('form');
  };

  const handleClose = () => {
    setStep('form');
    setNormalizedData(null);
    setSubmitError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={handleClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-lg z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.drawer.addMachineTitle}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step === 'form' ? t.drawer.addMachineDesc : t.drawer.confirmDesc}
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
              <p className="text-sm font-medium text-red-900 dark:text-red-100">{submitError}</p>
            </div>
          )}

          {step === 'form' && <MachineForm profiles={profiles} onSubmit={handleFormSubmit} onCancel={handleClose} isLoading={isLoading} />}

          {step === 'confirm' && normalizedData && (
            <MachineConfirmCard data={normalizedData} onConfirm={handleConfirm} onEdit={handleEdit} isLoading={isLoading} />
          )}
        </div>
      </div>
    </>
  );
}

