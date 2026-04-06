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
import Link from 'next/link';
import type { CreateMachinePayload, CreateMachineProfilePayload, MachineConfigResponse } from '@/types/machine-config';
import type { ImportEntityType, ImportExecutionSummary } from '@/types/machine-import';

export default function MachineManagementPage() {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const { machines, isLoading, error, createMachine, deleteMachine, loadMachines, enableMachine, disableMachine } = useMachineManagement();
  const { profiles, error: profileError, loadProfiles, createProfile } = useMachineProfiles();
  const { testConnection, connectMachine, disconnectMachine } = useMachineConnectionActions();

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'modbus-tcp'>('all');
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
    [createMachine, t.errors.createMachineFailed, t.toast.addSuccess],
  );

  const handleImportFiles = useCallback(
    async (type: ImportEntityType, result: ImportExecutionSummary) => {
      setIsImporting(true);
      try {
        const importedCount = result.successCount;
        if (type === 'machines') {
          await loadMachines();
        }
        if (type === 'profiles' || type === 'mappings') {
          await loadProfiles();
        }

        showToast('success', t.toast.importSuccess.replace('{{count}}', String(importedCount)));
      } catch (err) {
        const message = err instanceof Error ? err.message : t.errors.importFailed;
        showToast('error', message);
        throw err;
      } finally {
        setIsImporting(false);
      }
    },
    [loadMachines, loadProfiles, t.errors.importFailed, t.toast.importSuccess],
  );

  const handleCreateProfile = useCallback(async (payload: CreateMachineProfilePayload) => {
    const created = await createProfile(payload);
    showToast('success', `${selectedLanguage === 'vi' ? 'Da tao profile' : 'Profile created'}: ${created.profileCode}`);
    await loadProfiles();
    return created;
  }, [createProfile, loadProfiles, selectedLanguage]);

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

  const handleToggleEnabled = useCallback(async (machine: MachineConfigResponse) => {
    try {
      if (machine.enabled) {
        await disableMachine(machine.id);
      } else {
        await enableMachine(machine.id);
      }
      await loadMachines();
    } catch {
      showToast('error', t.errors.updateMachineFailed);
    }
  }, [disableMachine, enableMachine, loadMachines, t.errors.updateMachineFailed]);

  const filteredMachines = machines.filter((machine) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q
      || machine.machineCode.toLowerCase().includes(q)
      || machine.machineName.toLowerCase().includes(q);
    const matchesProtocol = protocolFilter === 'all' || machine.protocol === protocolFilter;
    return matchesSearch && matchesProtocol;
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <MachineManagementHeader
          onAddMachine={() => setShowAddDrawer(true)}
          onImportConfig={() => setShowImportDrawer(true)}
          onRefresh={() => loadMachines()}
          searchValue={search}
          onSearchChange={setSearch}
          protocolFilter={protocolFilter}
          onProtocolFilterChange={setProtocolFilter}
          isLoading={isLoading || isCreating}
        />

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
          {selectedLanguage === 'vi' ? 'Trang nay la danh sach quan ly cau hinh may.' : 'This page is the machine configuration management list.'}{' '}
          <Link href="/machines" className="font-semibold underline underline-offset-2">
            {selectedLanguage === 'vi' ? 'Mo Machine Realtime' : 'Open machine realtime'}
          </Link>
        </div>

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
          machines={filteredMachines}
          isLoading={isLoading}
          onDelete={handleDeleteMachine}
          onToggleEnabled={handleToggleEnabled}
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
          onImported={handleImportFiles}
          onCreateProfile={handleCreateProfile}
          isLoading={isCreating}
        />

        <ImportMachineDrawer
          isOpen={showImportDrawer}
          onClose={() => setShowImportDrawer(false)}
          onImported={handleImportFiles}
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


