import { useCallback, useEffect, useMemo, useState } from 'react';
import { alarmsApi } from '@/lib/api/alarms';
import { appEnv } from '@/lib/config/env';
import { useMachineStore } from '@/lib/store';
import type { MachineEvent } from '@/types';

export const useAlarmsData = () => {
  const { events: storeEvents } = useMachineStore();
  const [events, setEvents] = useState<MachineEvent[]>(storeEvents);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    setLoading(true);
    setError(null);
    try {
      const [active, history] = await Promise.all([
        alarmsApi.getActiveAlarms(),
        alarmsApi.getAlarmHistory(0, 100),
      ]);
      const merged = [...active, ...history].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const seen = new Set<string>();
      const unique = merged.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setEvents(unique);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc canh bao');
      setEvents(storeEvents);
    } finally {
      setLoading(false);
    }
  }, [storeEvents]);

  const acknowledge = useCallback(
    async (alarmId: string, acknowledgedBy = 'ui-operator') => {
      if (appEnv.useMock) {
        setEvents((prev) => prev.map((event) => (event.id === alarmId ? { ...event, acknowledged: true } : event)));
        return;
      }

      const previous = events;
      setEvents((prev) => prev.map((event) => (event.id === alarmId ? { ...event, acknowledged: true, acknowledgedBy } : event)));
      try {
        await alarmsApi.acknowledgeAlarm(alarmId, { acknowledgedBy });
      } catch (e) {
        setEvents(previous);
        setError(e instanceof Error ? e.message : 'Khong xac nhan duoc canh bao');
      }
    },
    [events],
  );

  const acknowledgeMany = useCallback(
    async (alarmIds: string[], acknowledgedBy = 'ui-operator') => {
      for (const alarmId of alarmIds) {
        await acknowledge(alarmId, acknowledgedBy);
      }
    },
    [acknowledge],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (appEnv.useMock) {
      setEvents(storeEvents);
    }
  }, [storeEvents]);

  const upsertEvent = useCallback((event: MachineEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev.filter((item) => item.id !== event.id)].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      return next.slice(0, 150);
    });
  }, []);

  return useMemo(
    () => ({
      events,
      loading,
      error,
      usingMock: appEnv.useMock,
      refresh: load,
      acknowledge,
      acknowledgeMany,
      upsertEvent,
    }),
    [events, loading, error, load, acknowledge, acknowledgeMany, upsertEvent],
  );
};

