'use client';

import { useState, useCallback, useEffect } from 'react';
import { machineConfigsApi } from '@/lib/api/machine-configs';
import type { MachineConfigResponse, CreateMachinePayload, ConnectionTestResult } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

const getFriendlyErrorMessage = (err: unknown, fallback: string, selectedLanguage: 'en' | 'vi'): string => {
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;
  if (!(err instanceof Error) || !err.message) return fallback;

  const raw = err.message.toLowerCase();
  if (raw.includes('timeout')) {
    return t.errors.timeout;
  }
  if (raw.includes('khong ket noi duoc may chu') || raw.includes('next_public_api_base_url')) {
    return t.errors.network;
  }

  return err.message;
};

export function useMachineManagement() {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;
  const [machines, setMachines] = useState<MachineConfigResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMachines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await machineConfigsApi.getMachineConfigs();
      setMachines(data);
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.loadMachinesFailed, selectedLanguage);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage, t.errors.loadMachinesFailed]);

  const createMachine = useCallback(async (payload: CreateMachinePayload): Promise<MachineConfigResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await machineConfigsApi.createMachineConfig(payload);
      setMachines((prev) => [...prev, result]);
      return result;
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.createMachineFailed, selectedLanguage);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage, t.errors.createMachineFailed]);

  const updateMachine = useCallback(async (id: string, payload: Partial<CreateMachinePayload>): Promise<MachineConfigResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await machineConfigsApi.updateMachineConfig(id, payload);
      setMachines((prev) => prev.map((m) => (m.id === id ? result : m)));
      return result;
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.updateMachineFailed, selectedLanguage);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage, t.errors.updateMachineFailed]);

  const deleteMachine = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await machineConfigsApi.deleteMachineConfig(id);
      setMachines((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.deleteMachineFailed, selectedLanguage);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage, t.errors.deleteMachineFailed]);

  const enableMachine = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await machineConfigsApi.enableMachine(id);
      await loadMachines();
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.updateMachineFailed, selectedLanguage);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMachines, selectedLanguage, t.errors.updateMachineFailed]);

  const disableMachine = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await machineConfigsApi.disableMachine(id);
      await loadMachines();
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.updateMachineFailed, selectedLanguage);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMachines, selectedLanguage, t.errors.updateMachineFailed]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  return {
    machines,
    isLoading,
    error,
    loadMachines,
    createMachine,
    updateMachine,
    deleteMachine,
    enableMachine,
    disableMachine,
  };
}

export function useMachineConnectionActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const testConnection = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      const result = await machineConfigsApi.testMachineConnection(machineId);
      setTestResult(result);
      return result;
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectMachine = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      return await machineConfigsApi.connectMachine(machineId);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectMachine = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      return await machineConfigsApi.disconnectMachine(machineId);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reconnectMachine = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      return await machineConfigsApi.connectMachine(machineId);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    testResult,
    testConnection,
    connectMachine,
    disconnectMachine,
    reconnectMachine,
  };
}

