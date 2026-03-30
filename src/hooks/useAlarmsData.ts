import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alarmsApi } from '@/lib/api/alarms';
import { appEnv } from '@/lib/config/env';
import { useMachineStore } from '@/lib/store';
import { useRealtimeStore } from '@/lib/realtime-store';
import type { MachineEvent } from '@/types';

const DEFAULT_POLL_MS = 30_000; // 30 giây

export const useAlarmsData = (pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const { events: storeEvents } = useMachineStore();
  const { realtimeAlarmEvents } = useRealtimeStore();
  const [events, setEvents] = useState<MachineEvent[]>(appEnv.useMock ? storeEvents : []);
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    if (!initialLoadDone.current) setLoading(true);
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
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc canh bao');
      if (!initialLoadDone.current) setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);


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

  // Polling tự động
  useEffect(() => {
    if (appEnv.useMock || pollIntervalMs <= 0) return;
    const timer = setInterval(() => { void load(); }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  useEffect(() => {
    if (appEnv.useMock) {
      setEvents(storeEvents);
    }
  }, [storeEvents]);

  // Merge realtime events with REST events
  useEffect(() => {
    if (!appEnv.useMock && realtimeAlarmEvents.length > 0) {
      setEvents((prev) => {
        const merged = [...realtimeAlarmEvents, ...prev];
        const seen = new Set<string>();
        const unique = merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 150);
      });
    }
  }, [realtimeAlarmEvents]);

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

