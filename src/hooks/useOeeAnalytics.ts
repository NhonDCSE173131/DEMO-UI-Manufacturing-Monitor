import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { oeeApi, type OeeAnalyticsQuery } from '@/lib/api/oee';
import type { AnalyticsBreakdownItemResponse, AnalyticsSeriesPointResponse, OeeOverviewResponse } from '@/types/api';

interface OeeAnalyticsState {
  overview: OeeOverviewResponse | null;
  trend: AnalyticsSeriesPointResponse[];
  byMachine: AnalyticsBreakdownItemResponse[];
  losses: AnalyticsBreakdownItemResponse[];
}

const initialState: OeeAnalyticsState = {
  overview: null,
  trend: [],
  byMachine: [],
  losses: [],
};

const DEFAULT_POLL_MS = 15_000; // 15 giây

export const useOeeAnalytics = (query: OeeAnalyticsQuery, pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const [state, setState] = useState<OeeAnalyticsState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    setError(null);
    try {
      const [overview, trend, byMachine, losses] = await Promise.all([
        oeeApi.getOverview(),
        oeeApi.getTrend(query),
        oeeApi.getByMachine(query),
        oeeApi.getLosses(query),
      ]);
      setState({ overview, trend, byMachine, losses });
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu OEE');
      if (!initialLoadDone.current) setState(initialState);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Polling tự động
  useEffect(() => {
    if (pollIntervalMs <= 0) return;
    const timer = setInterval(() => { void load(); }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  return useMemo(
    () => ({ ...state, loading, error, refresh: load }),
    [state, loading, error, load],
  );
};
