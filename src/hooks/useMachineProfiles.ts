'use client';

import { useState, useCallback, useEffect } from 'react';
import { machineProfileApi } from '@/lib/api/machine-config';
import type { MachineProfileResponse } from '@/types/machine-config';
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
      const data = await machineProfileApi.getProfiles();
      setProfiles(data);
    } catch {
      setError(t.errors.loadProfilesFailed);
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
  };
}

