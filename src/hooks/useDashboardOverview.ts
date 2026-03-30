import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appEnv } from '@/lib/config/env';
import { dashboardApi, type DashboardOverviewResponse } from '@/lib/api/dashboard';

const DEFAULT_POLL_MS = 10_000; // 10 giây

export const useDashboardOverview = (pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    // Chỉ hiện loading spinner lần đầu, không flash khi poll
    if (!initialLoadDone.current) setLoading(true);
    setError(null);
    try {
      setOverview(await dashboardApi.getOverview());
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc tong quan dashboard');
      // Giữ overview cũ nếu đã có, chỉ clear khi chưa bao giờ load thành công
      if (!initialLoadDone.current) setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lần đầu load
  useEffect(() => {
    load();
  }, [load]);

  // Polling tự động
  useEffect(() => {
    if (appEnv.useMock || pollIntervalMs <= 0) return;
    const timer = setInterval(() => { void load(); }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  return useMemo(
    () => ({ overview, loading, error, usingMock: appEnv.useMock, refresh: load }),
    [overview, loading, error, load],
  );
};

