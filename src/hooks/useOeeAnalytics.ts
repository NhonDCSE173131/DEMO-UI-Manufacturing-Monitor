import { useCallback, useEffect, useMemo, useState } from 'react';
import { appEnv } from '@/lib/config/env';
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

export const useOeeAnalytics = (query: OeeAnalyticsQuery) => {
  const [state, setState] = useState<OeeAnalyticsState>(initialState);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
	if (appEnv.useMock) return;
	setLoading(true);
	setError(null);
	try {
	  const [overview, trend, byMachine, losses] = await Promise.all([
		oeeApi.getOverview(),
		oeeApi.getTrend(query),
		oeeApi.getByMachine(query),
		oeeApi.getLosses(query),
	  ]);
	  setState({ overview, trend, byMachine, losses });
	} catch (e) {
	  setError(e instanceof Error ? e.message : 'Khong tai duoc du lieu OEE');
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

