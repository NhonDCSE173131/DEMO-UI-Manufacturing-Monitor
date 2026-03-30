import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultSettingsThresholds, settingsApi, type SettingsThresholds } from '@/lib/api/settings';

export const useSettingsThresholds = () => {
  const [thresholds, setThresholds] = useState<SettingsThresholds>(defaultSettingsThresholds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getThresholds();
      setThresholds({
        ...defaultSettingsThresholds,
        ...data,
        maintenanceLeadDays: data.maintenanceLeadDays || defaultSettingsThresholds.maintenanceLeadDays,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ngưỡng hệ thống');
      setThresholds(defaultSettingsThresholds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return useMemo(
    () => ({ thresholds, loading, error, refresh: load }),
    [thresholds, loading, error, load],
  );
};
