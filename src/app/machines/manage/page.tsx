'use client';

import React, { useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { MachineManagementHeader } from '@/components/machines/MachineManagementHeader';
import { MachineTable } from '@/components/machines/MachineTable';
import { AddMachineDrawer } from '@/components/machines/AddMachineDrawer';
import { ImportMachineDrawer } from '@/components/machines/ImportMachineDrawer';
import { useMachineManagement, useMachineConnectionActions } from '@/hooks/useMachineManagement';
import { useMachineProfiles } from '@/hooks/useMachineProfiles';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import type { CreateMachinePayload, ImportMachineRow, ImportMode } from '@/types/machine-config';

export default function MachineManagementPage() {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const { machines, isLoading, error, createMachine, deleteMachine, loadMachines } = useMachineManagement();
  const { profiles, error: profileError, loadProfiles } = useMachineProfiles();
  const { testConnection, connectMachine, disconnectMachine } = useMachineConnectionActions();

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddMachine = useCallback(
    async (data: CreateMachinePayload) => {
      setIsCreating(true);
      try {
        await createMachine(data);
        showToast('success', t.toast.addSuccess);
      } catch (err) {
        const message = err instanceof Error ? err.message : t.errors.createMachineFailed;
        showToast('error', message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [createMachine],
  );

  const handleImportMachines = useCallback(
    async (rows: ImportMachineRow[], _mode: ImportMode, _file: File) => {
      setIsImporting(true);
      try {
        // Call import API through hook
        // For now, we'll create machines individually
        const validRows = rows.filter((r) => r.isValid);
        let successCount = 0;
        let failureCount = 0;

        for (const row of validRows) {
          try {
            const payload: CreateMachinePayload = {
              machineCode: row.machineCode,
              machineName: row.machineName,
              protocol: row.protocol,
              host: row.host,
              port: typeof row.port === 'number' ? row.port : parseInt(row.port, 10),
              profileCode: row.profileCode,
              pollIntervalMs: 1000,
              enabled: true,
              autoConnect: true,
              description: row.description,
            };

            await createMachine(payload);
            successCount++;
          } catch {
            failureCount++;
          }
        }

        showToast('success', t.toast.importSuccess.replace('{{count}}', String(successCount)));
      } catch (err) {
        const message = err instanceof Error ? err.message : t.errors.importFailed;
        showToast('error', message);
        throw err;
      } finally {
        setIsImporting(false);
      }
    },
    [createMachine],
  );

  const handleDeleteMachine = useCallback(
    async (machineId: string) => {
      if (!window.confirm(t.dialog.confirmDelete)) return;

      try {
        await deleteMachine(machineId);
        showToast('success', t.toast.deleteSuccess);
      } catch (err) {
        const message = err instanceof Error ? err.message : t.errors.deleteMachineFailed;
        showToast('error', message);
      }
    },
    [deleteMachine, t.dialog.confirmDelete, t.errors.deleteMachineFailed, t.toast.deleteSuccess],
  );

  const handleTestConnection = useCallback(
    async (machineId: string) => {
      try {
        const result = await testConnection(machineId);
        if (result.isConnected) {
          showToast('success', t.toast.testConnectionSuccess);
        } else {
          showToast('error', result.message || t.errors.network);
        }
      } catch (err) {
        showToast('error', t.errors.network);
      }
    },
    [testConnection, t.errors.network, t.toast.testConnectionSuccess],
  );

  const handleConnectMachine = useCallback(
    async (machineId: string) => {
      try {
        await connectMachine(machineId);
        showToast('success', t.toast.connectRequested);
        // Reload after 1 second
        setTimeout(() => loadMachines(), 1000);
      } catch (err) {
        showToast('error', t.errors.network);
      }
    },
    [connectMachine, loadMachines, t.errors.network, t.toast.connectRequested],
  );

  const handleDisconnectMachine = useCallback(
    async (machineId: string) => {
      try {
        await disconnectMachine(machineId);
        showToast('success', t.toast.disconnectSuccess);
        // Reload after 1 second
        setTimeout(() => loadMachines(), 1000);
      } catch (err) {
        showToast('error', t.errors.network);
      }
    },
    [disconnectMachine, loadMachines, t.errors.network, t.toast.disconnectSuccess],
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <MachineManagementHeader
          onAddMachine={() => setShowAddDrawer(true)}
          onImportConfig={() => setShowImportDrawer(true)}
          isLoading={isLoading || isCreating}
        />

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50 p-4 shadow-sm dark:border-red-900/50 dark:from-red-950/30 dark:to-rose-950/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-700 dark:bg-red-900/40 dark:text-red-200">
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">{t.loadMachineDataFailed}</p>
                <p className="mt-1 text-sm text-red-800/90 dark:text-red-200/90">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadMachines()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/30"
              >
                <RefreshCw size={14} />
                {t.retry}
              </button>
            </div>
          </div>
        )}

        {profileError && (
          <div className="mb-6 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/30 dark:to-yellow-950/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t.errors.loadProfilesFailed}</p>
                <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">{profileError}</p>
              </div>
              <button
                type="button"
                onClick={() => loadProfiles()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                <RefreshCw size={14} />
                {t.retry}
              </button>
            </div>
          </div>
        )}

        {/* Machine Table */}
        <MachineTable
          machines={machines}
          isLoading={isLoading}
          onDelete={handleDeleteMachine}
          onTestConnection={handleTestConnection}
          onConnect={handleConnectMachine}
          onDisconnect={handleDisconnectMachine}
        />

        {/* Drawers */}
        <AddMachineDrawer
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          onSubmit={handleAddMachine}
          profiles={profiles}
          isLoading={isCreating}
        />

        <ImportMachineDrawer
          isOpen={showImportDrawer}
          onClose={() => setShowImportDrawer(false)}
          onSubmit={handleImportMachines}
          isLoading={isImporting}
        />

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } animate-in fade-in slide-in-from-bottom-4`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}


