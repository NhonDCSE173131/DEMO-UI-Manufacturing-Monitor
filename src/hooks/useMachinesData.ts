import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { appEnv } from '@/lib/config/env';
import { useMachineStore } from '@/lib/store';
import { useRealtimeStore } from '@/lib/realtime-store';
import type { Machine, MachineEvent } from '@/types';
import {
  applyMachineImageOverrides,
  getMachineImageOverrideChangeEvent,
  getMachineImageOverrideStorageKey,
  loadMachineImageOverrides,
  removeMachineImageOverride,
  saveMachineImageOverride,
  type MachineImageOverride,
} from '@/lib/machine-image-overrides';

const DEFAULT_POLL_MS = 30_000; // 30 giây

export const useMachinesData = (pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const { machines: storeMachines, events: storeEvents } = useMachineStore();
  const { snapshotsByMachineId, connectionStateByMachineId, lastSeenByMachineId, dataFreshnessByMachineId } = useRealtimeStore();
  const [machines, setMachines] = useState<Machine[]>(
    appEnv.useMock ? applyMachineImageOverrides(storeMachines) : [],
  );
  const [events, setEvents] = useState<MachineEvent[]>(appEnv.useMock ? storeEvents : []);
  const [imageOverrides, setImageOverrides] = useState<Record<string, MachineImageOverride>>(loadMachineImageOverrides());
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const syncImageOverrides = useCallback(() => {
    const overrides = loadMachineImageOverrides();
    setImageOverrides(overrides);
    setMachines((prev) => applyMachineImageOverrides(prev, overrides));
  }, []);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    if (!initialLoadDone.current) setLoading(true);
    setError(null);
    try {
      const [apiMachines, apiSnapshots] = await Promise.all([
        machinesApi.getMachines(),
        machinesApi.getMachineSnapshots().catch(() => []),
      ]);
      const snapshotsById = new Map(apiSnapshots.map((machine) => [machine.id, machine]));
      const mergedMachines = apiMachines.map((machine) => ({
        ...machine,
        ...(snapshotsById.get(machine.id) || {}),
      }));
      const overrides = loadMachineImageOverrides();
      setImageOverrides(overrides);
      setMachines(applyMachineImageOverrides(mergedMachines, overrides));
      if (!initialLoadDone.current) setEvents([]);
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu máy');
      if (!initialLoadDone.current) {
        setMachines([]);
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Lần đầu load
  useEffect(() => {
    load();
  }, [load]);

  // Polling tự động - refresh REST data định kỳ
  useEffect(() => {
    if (appEnv.useMock || pollIntervalMs <= 0) return;
    const timer = setInterval(() => { void load(); }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  useEffect(() => {
    if (appEnv.useMock) {
      const overrides = loadMachineImageOverrides();
      setImageOverrides(overrides);
      setMachines(applyMachineImageOverrides(storeMachines, overrides));
      setEvents(storeEvents);
    }
  }, [storeEvents, storeMachines]);

  // Apply realtime patches + connection state on top of machines
  useEffect(() => {
    if (!appEnv.useMock) {
      const hasSnapshots = Object.keys(snapshotsByMachineId).length > 0;
      const hasConnStates = Object.keys(connectionStateByMachineId).length > 0;
      if (!hasSnapshots && !hasConnStates) return;

      setMachines((prev) =>
        prev.map((machine) => {
          const rtPatch = snapshotsByMachineId[machine.id];
          const connState = connectionStateByMachineId[machine.id] as Machine['connectionState'] | undefined;
          const lastSeen = lastSeenByMachineId[machine.id];
          const freshness = dataFreshnessByMachineId[machine.id];

          const updates: Partial<Machine> = {};
          if (rtPatch) Object.assign(updates, rtPatch);
          if (connState) {
            updates.connectionState = connState;
            updates.liveDataAvailable = connState === 'ONLINE';
          }
          if (lastSeen) updates.lastSeenAt = lastSeen;
          if (freshness !== undefined) updates.dataFreshnessSec = freshness;

          if (Object.keys(updates).length === 0) return machine;
          return { ...machine, ...updates };
        }),
      );
    }
  }, [snapshotsByMachineId, connectionStateByMachineId, lastSeenByMachineId, dataFreshnessByMachineId]);

  useEffect(() => {
    const handleChanged = () => syncImageOverrides();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getMachineImageOverrideStorageKey()) {
        syncImageOverrides();
      }
    };

    window.addEventListener(getMachineImageOverrideChangeEvent(), handleChanged as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(getMachineImageOverrideChangeEvent(), handleChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncImageOverrides]);

  const applyMachinePatch = useCallback((machineId: string, updates: Partial<Machine>) => {
    setMachines((prev) => prev.map((machine) => (machine.id === machineId ? { ...machine, ...updates } : machine)));
  }, []);

  const appendEvent = useCallback((event: MachineEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev.filter((item) => item.id !== event.id)];
      return next.slice(0, 100);
    });
  }, []);

  const saveMachineImage = useCallback(
    async (machineId: string, image: string, fileName?: string) => {
      const override = saveMachineImageOverride(machineId, image, fileName);
      setImageOverrides((prev) => ({ ...prev, [machineId]: override }));
      setMachines((prev) => prev.map((machine) => (machine.id === machineId ? { ...machine, image } : machine)));
      return override;
    },
    [],
  );

  const resetMachineImage = useCallback(
    async (machineId: string) => {
      removeMachineImageOverride(machineId);
      setImageOverrides((prev) => {
        const next = { ...prev };
        delete next[machineId];
        return next;
      });
      await load();
    },
    [load],
  );

  return useMemo(
    () => ({
      machines,
      events,
      imageOverrides,
      loading,
      error,
      refresh: load,
      usingMock: appEnv.useMock,
      applyMachinePatch,
      appendEvent,
      saveMachineImage,
      resetMachineImage,
    }),
    [events, machines, imageOverrides, loading, error, load, applyMachinePatch, appendEvent, saveMachineImage, resetMachineImage],
  );
};

