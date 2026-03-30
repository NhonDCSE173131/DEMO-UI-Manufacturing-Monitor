import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dashboardApi, type DashboardOverviewResponse } from '@/lib/api/dashboard';

const DEFAULT_POLL_MS = 60_000; // Dashboard live lấy từ SSE, REST chỉ refresh nền

export const useDashboardOverview = (pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    setError(null);
    try {
      setOverview(await dashboardApi.getOverview());
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được tổng quan dashboard');
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
    if (pollIntervalMs <= 0) return;
    const timer = setInterval(() => { void load(); }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  return useMemo(
    () => ({ overview, loading, error, refresh: load }),
    [overview, loading, error, load],
  );
};
