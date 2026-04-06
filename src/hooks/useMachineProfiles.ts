'use client';

import { useState, useCallback, useEffect } from 'react';
import { machineProfilesApi } from '@/lib/api/machine-configs';
import type { CreateMachineProfilePayload, MachineProfileResponse } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

export function useMachineProfiles() {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;
  const [profiles, setProfiles] = useState<MachineProfileResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await machineProfilesApi.getProfiles();
      setProfiles(data);
    } catch {
      setError(t.errors.loadProfilesFailed);
    } finally {
      setIsLoading(false);
    }
  }, [t.errors.loadProfilesFailed]);

  const createProfile = useCallback(async (payload: CreateMachineProfilePayload): Promise<MachineProfileResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await machineProfilesApi.createProfile(payload);
      setProfiles((prev) => [created, ...prev]);
      return created;
    } catch {
      setError(t.errors.loadProfilesFailed);
      throw new Error(t.errors.loadProfilesFailed);
    } finally {
      setIsLoading(false);
    }
  }, [t.errors.loadProfilesFailed]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return {
    profiles,
    isLoading,
    error,
    loadProfiles,
    createProfile,
  };
}

