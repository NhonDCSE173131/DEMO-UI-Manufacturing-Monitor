'use client';

import { useState, useCallback, useEffect } from 'react';
import { machineConfigApi } from '@/lib/api/machine-config';
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
      const data = await machineConfigApi.getMachineConfigs();
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
      const result = await machineConfigApi.createMachineConfig(payload);
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
      const result = await machineConfigApi.updateMachineConfig(id, payload);
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
      await machineConfigApi.deleteMachineConfig(id);
      setMachines((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const message = getFriendlyErrorMessage(err, t.errors.deleteMachineFailed, selectedLanguage);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage, t.errors.deleteMachineFailed]);

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
  };
}

export function useMachineConnectionActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const testConnection = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      const result = await machineConfigApi.testMachineConnection(machineId);
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
      return await machineConfigApi.connectMachine(machineId);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectMachine = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      return await machineConfigApi.disconnectMachine(machineId);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reconnectMachine = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      return await machineConfigApi.reconnectMachine(machineId);
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

