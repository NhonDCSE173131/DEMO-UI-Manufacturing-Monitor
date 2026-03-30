import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { energyApi, type EnergyAnalyticsQuery } from '@/lib/api/energy';
import type { AnalyticsBreakdownItemResponse, AnalyticsSeriesPointResponse, EnergyOverviewResponse } from '@/types/api';

interface EnergyAnalyticsState {
  overview: EnergyOverviewResponse | null;
  trend: AnalyticsSeriesPointResponse[];
  byArea: AnalyticsBreakdownItemResponse[];
  byMachine: AnalyticsBreakdownItemResponse[];
  cost: EnergyOverviewResponse | null;
}

const initialState: EnergyAnalyticsState = {
  overview: null,
  trend: [],
  byArea: [],
  byMachine: [],
  cost: null,
};

const DEFAULT_POLL_MS = 60_000; // Aggregate analytics refresh chậm hơn live SSE

export const useEnergyAnalytics = (query: EnergyAnalyticsQuery, pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const [state, setState] = useState<EnergyAnalyticsState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    setError(null);
    try {
      const [overview, trend, byArea, byMachine, cost] = await Promise.all([
        energyApi.getOverview(),
        energyApi.getTrend(query),
        energyApi.getByArea(query),
        energyApi.getByMachine(query),
        energyApi.getCost(query),
      ]);
      setState({ overview, trend, byArea, byMachine, cost });
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu năng lượng');
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
