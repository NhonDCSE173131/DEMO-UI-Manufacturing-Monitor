import { useCallback, useEffect, useMemo, useState } from 'react';
import { appEnv } from '@/lib/config/env';
import { dashboardApi, type DashboardOverviewResponse } from '@/lib/api/dashboard';

export const useDashboardOverview = () => {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    setLoading(true);
    setError(null);
    try {
      setOverview(await dashboardApi.getOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc tong quan dashboard');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return useMemo(
    () => ({ overview, loading, error, usingMock: appEnv.useMock, refresh: load }),
    [overview, loading, error, load],
  );
};

