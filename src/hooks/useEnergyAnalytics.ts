import { useCallback, useEffect, useMemo, useState } from 'react';
import { appEnv } from '@/lib/config/env';
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

export const useEnergyAnalytics = (query: EnergyAnalyticsQuery) => {
  const [state, setState] = useState<EnergyAnalyticsState>(initialState);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    setLoading(true);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc du lieu nang luong');
      setState(initialState);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ ...state, loading, error, usingMock: appEnv.useMock, refresh: load }),
    [state, loading, error, load],
  );
};

