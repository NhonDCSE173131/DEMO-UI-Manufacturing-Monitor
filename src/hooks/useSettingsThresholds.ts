import { useCallback, useEffect, useMemo, useState } from 'react';
import { appEnv } from '@/lib/config/env';
import { defaultSettingsThresholds, settingsApi, type SettingsThresholds } from '@/lib/api/settings';

export const useSettingsThresholds = () => {
  const [thresholds, setThresholds] = useState<SettingsThresholds>(defaultSettingsThresholds);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getThresholds();
      setThresholds({
        ...defaultSettingsThresholds,
        ...data,
        maintenanceLeadDays: Array.isArray(data.maintenanceLeadDays)
          ? data.maintenanceLeadDays
          : defaultSettingsThresholds.maintenanceLeadDays,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc nguong he thong');
      setThresholds(defaultSettingsThresholds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return useMemo(
    () => ({ thresholds, loading, error, usingMock: appEnv.useMock, refresh: load }),
    [thresholds, loading, error, load],
  );
};

